import type { DecryptedMessage, EncryptedAttachment, EncryptedMessage } from "@/lib/types";
import type { StoredIdentity } from "@/lib/storage";
import { loadIdentity, saveIdentity } from "@/lib/storage";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function loadOrCreateIdentity(
  owner: string,
  fallbackOwner?: string
): Promise<StoredIdentity> {
  const existing = loadIdentity(owner) ??
    (fallbackOwner ? loadIdentity(fallbackOwner) : null);

  if (existing) {
    saveIdentity(owner, existing);
    return existing;
  }

  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    true,
    ["deriveKey"]
  );

  const publicJwk = (await crypto.subtle.exportKey("jwk", keyPair.publicKey)) as JsonWebKey;
  const privateJwk = (await crypto.subtle.exportKey("jwk", keyPair.privateKey)) as JsonWebKey;
  const identity = { publicJwk, privateJwk };

  saveIdentity(owner, identity);
  return identity;
}

export async function deriveConversationKey(
  identity: StoredIdentity,
  recipientPublicKeyJwk: string
) {
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    identity.privateJwk,
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    false,
    ["deriveKey"]
  );

  const publicKey = await crypto.subtle.importKey(
    "jwk",
    JSON.parse(recipientPublicKeyJwk) as JsonWebKey,
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    false,
    []
  );

  return crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: publicKey
    },
    privateKey,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptText(key: CryptoKey, text: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv
    },
    key,
    encoder.encode(JSON.stringify({ text }))
  );

  return {
    ciphertextBase64: toBase64(ciphertext),
    ivBase64: toBase64(iv)
  };
}

export async function decryptText(key: CryptoKey, ciphertextBase64: string, ivBase64: string) {
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromBase64(ivBase64)
    },
    key,
    fromBase64(ciphertextBase64)
  );

  const payload = JSON.parse(decoder.decode(decrypted)) as { text?: string };
  return payload.text ?? "";
}

export async function encryptAttachment(key: CryptoKey, file: File): Promise<EncryptedAttachment> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const bytes = await file.arrayBuffer();
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv
    },
    key,
    bytes
  );

  return {
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    ciphertextBase64: toBase64(ciphertext),
    ivBase64: toBase64(iv),
    sizeBytes: file.size
  };
}

export async function decryptMessage(
  key: CryptoKey,
  message: EncryptedMessage
): Promise<DecryptedMessage> {
  const text = await decryptText(key, message.ciphertextBase64, message.ivBase64);

  let attachmentUrl: string | undefined;
  let attachmentName: string | undefined;
  let attachmentMimeType: string | undefined;

  if (message.attachment) {
    const decryptedAttachment = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: fromBase64(message.attachment.ivBase64)
      },
      key,
      fromBase64(message.attachment.ciphertextBase64)
    );

    const blob = new Blob([decryptedAttachment], {
      type: message.attachment.mimeType
    });

    attachmentUrl = URL.createObjectURL(blob);
    attachmentName = message.attachment.fileName;
    attachmentMimeType = message.attachment.mimeType;
  }

  return {
    id: message.id,
    conversationId: message.conversationId,
    senderUserId: message.senderUserId,
    text,
    sentAtUtc: message.sentAtUtc,
    updatedAtUtc: message.updatedAtUtc,
    attachmentUrl,
    attachmentName,
    attachmentMimeType
  };
}

function toBase64(bytes: ArrayBufferLike | Uint8Array) {
  const buffer = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";

  buffer.forEach((value) => {
    binary += String.fromCharCode(value);
  });

  return window.btoa(binary);
}

function fromBase64(value: string) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}
