"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { CredentialResponse } from "@react-oauth/google";
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel
} from "@microsoft/signalr";
import { Sparkles } from "lucide-react";
import {
  createConversation,
  getApiBaseUrl,
  getCurrentUser,
  listConversations,
  listMessages,
  loginUser,
  lookupUser,
  registerUser,
  signInWithGoogle
} from "@/lib/api";
import { decryptMessage, deriveConversationKey, encryptAttachment, encryptText, loadOrCreateIdentity } from "@/lib/crypto";
import { clearSession, loadSession, saveIdentity, saveSession } from "@/lib/storage";
import type { AuthResponse, Conversation, DecryptedMessage, EncryptedMessage, UserProfile } from "@/lib/types";
import { AuthPanel, type PasswordAuthRequest } from "@/components/auth/auth-panel";
import { ChatConversationView } from "@/components/chat/chat-conversation-view";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { GoogleProvider } from "@/components/providers/google-oauth-provider";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const GOOGLE_ENABLED =
  Boolean(GOOGLE_CLIENT_ID) && !GOOGLE_CLIENT_ID.startsWith("replace-with");

export function SecureChatApp() {
  return GOOGLE_ENABLED ? (
    <GoogleProvider>
      <SecureChatAppInner />
    </GoogleProvider>
  ) : (
    <SecureChatAppInner />
  );
}

function SecureChatAppInner() {
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [recipientUserName, setRecipientUserName] = useState("");
  const [previewUser, setPreviewUser] = useState<UserProfile | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deferredRecipientUserName = useDeferredValue(recipientUserName.trim());
  const hubConnectionRef = useRef<HubConnection | null>(null);

  useEffect(() => {
    const storedSession = loadSession();

    if (!storedSession) {
      return;
    }

    setAuth(storedSession);
    void getCurrentUser(storedSession.token)
      .then(setCurrentUser)
      .catch(() => {
        clearSession();
        setAuth(null);
      });
  }, []);

  useEffect(() => {
    if (!auth) {
      return;
    }

    void refreshConversations(auth.token);
  }, [auth]);

  useEffect(() => {
    if (!auth) {
      return;
    }

    const connection = new HubConnectionBuilder()
      .withUrl(`${getApiBaseUrl()}/hubs/chat`, {
        accessTokenFactory: () => auth.token
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on("ReceiveEncryptedMessage", async (message: EncryptedMessage) => {
      const conversation = conversationsRef.current.find(
        (item) => item.id === message.conversationId
      );

      if (!conversation || !currentUserRef.current) {
        await refreshConversations(auth.token);
        return;
      }

      try {
        const decrypted = await decryptIncomingMessage(
          conversation,
          currentUserRef.current,
          message
        );

        setMessages((existing) =>
          message.conversationId === selectedConversationRef.current
            ? upsertMessage(existing, decrypted)
            : existing
        );
      } catch {
        setError("A message arrived but could not be decrypted with this device key.");
      }

      setConversations((existing) =>
        [...existing]
          .map((item) =>
            item.id === message.conversationId
              ? { ...item, lastMessageAtUtc: message.sentAtUtc }
              : item
          )
          .sort(sortConversations)
      );
    });

    void connection
      .start()
      .then(() => {
        hubConnectionRef.current = connection;

        if (selectedConversationRef.current) {
          return connection.invoke("JoinConversation", selectedConversationRef.current);
        }

        return Promise.resolve();
      })
      .catch((connectionError) => {
        setError(connectionError instanceof Error ? connectionError.message : "SignalR connection failed.");
      });

    return () => {
      void connection.stop();
      hubConnectionRef.current = null;
    };
  }, [auth]);

  useEffect(() => {
    if (!auth || !selectedConversationId) {
      setMessages([]);
      return;
    }

    const hub = hubConnectionRef.current;

    if (hub && hub.state === HubConnectionState.Connected) {
      void hub.invoke("JoinConversation", selectedConversationId).catch(() => undefined);
    }

    void loadConversationMessages(auth.token, selectedConversationId);
  }, [auth, selectedConversationId]);

  useEffect(() => {
    if (!auth || deferredRecipientUserName.length < 3) {
      setPreviewUser(null);
      return;
    }

    const timeout = window.setTimeout(() => {
      void lookupUser(auth.token, deferredRecipientUserName)
        .then((user) => {
          setPreviewUser(user.userName === currentUserRef.current?.userName ? null : user);
        })
        .catch(() => {
          setPreviewUser(null);
        });
    }, 280);

    return () => window.clearTimeout(timeout);
  }, [auth, deferredRecipientUserName]);

  const conversationsRef = useRef<Conversation[]>([]);
  const currentUserRef = useRef<UserProfile | null>(null);
  const selectedConversationRef = useRef<string | null>(null);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    selectedConversationRef.current = selectedConversationId;
  }, [selectedConversationId]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  async function handleGoogleSuccess(credentialResponse: CredentialResponse) {
    if (!credentialResponse.credential) {
      setError("Google sign-in did not return an ID token.");
      return;
    }

    setIsSigningIn(true);
    setError(null);

    try {
      const payload = parseJwt(credentialResponse.credential);
      const preferredUserName = buildUserName(payload.email, payload.name);
      const googleIdentityOwner = `google:${payload.subject}`;
      const identity = await loadOrCreateIdentity(
        googleIdentityOwner,
        preferredUserName
      );

      const authResponse = await signInWithGoogle(
        credentialResponse.credential,
        preferredUserName,
        JSON.stringify(identity.publicJwk)
      );

      saveIdentity(authResponse.user.userName, identity);
      saveIdentity(googleIdentityOwner, identity);
      await completeAuthentication(authResponse);
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Google sign-in failed.");
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handlePasswordAuth(request: PasswordAuthRequest) {
    setIsSigningIn(true);
    setError(null);

    try {
      const identity = await loadOrCreateIdentity(request.userName);
      const publicKey = JSON.stringify(identity.publicJwk);
      const authResponse =
        request.mode === "register"
          ? await registerUser(
              request.userName,
              request.displayName,
              request.password,
              publicKey
            )
          : await loginUser(request.userName, request.password, publicKey);

      saveIdentity(authResponse.user.userName, identity);
      await completeAuthentication(authResponse);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Authentication failed.");
    } finally {
      setIsSigningIn(false);
    }
  }

  async function completeAuthentication(authResponse: AuthResponse) {
    saveSession(authResponse);
    setAuth(authResponse);
    setCurrentUser(await getCurrentUser(authResponse.token));
  }

  async function refreshConversations(token: string) {
    try {
      const nextConversations = (await listConversations(token)).sort(sortConversations);
      setConversations(nextConversations);

      if (!selectedConversationRef.current && nextConversations[0]) {
        setSelectedConversationId(nextConversations[0].id);
      }
    } catch (conversationError) {
      setError(
        conversationError instanceof Error
          ? conversationError.message
          : "Failed to load conversations."
      );
    }
  }

  async function loadConversationMessages(token: string, conversationId: string) {
    const conversation = conversationsRef.current.find((item) => item.id === conversationId);
    const user = currentUserRef.current;

    if (!conversation || !user) {
      return;
    }

    setIsLoadingMessages(true);

    try {
      const encryptedMessages = await listMessages(token, conversationId);
      const decryptedMessages = await Promise.all(
        encryptedMessages.map((message) =>
          decryptIncomingMessage(conversation, user, message).catch(() => ({
            id: message.id,
            conversationId: message.conversationId,
            senderUserId: message.senderUserId,
            text: "[This message cannot be decrypted with the current device key.]",
            sentAtUtc: message.sentAtUtc
          }))
        )
      );

      setMessages(decryptedMessages);
    } catch (messageError) {
      setError(messageError instanceof Error ? messageError.message : "Failed to load messages.");
    } finally {
      setIsLoadingMessages(false);
    }
  }

  async function handleCreateConversation() {
    if (!auth || !previewUser) {
      return;
    }

    setIsCreatingConversation(true);
    setError(null);

    try {
      const createdConversation = await createConversation(auth.token, previewUser.userName);
      setConversations((existing) =>
        [createdConversation, ...existing.filter((item) => item.id !== createdConversation.id)].sort(
          sortConversations
        )
      );
      setSelectedConversationId(createdConversation.id);
      setRecipientUserName("");
      setPreviewUser(null);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create conversation.");
    } finally {
      setIsCreatingConversation(false);
    }
  }

  async function handleSendMessage() {
    if (!auth || !currentUser || !selectedConversation) {
      return;
    }

    if (!draft.trim() && !attachment) {
      return;
    }

    if (attachment && attachment.size > 5 * 1024 * 1024) {
      setError("Images must be 5 MB or smaller.");
      return;
    }

    const recipient = selectedConversation.participants.find(
      (participant) => participant.id !== currentUser.id
    );

    if (!recipient) {
      return;
    }

    setIsSendingMessage(true);
    setError(null);

    try {
      const identity = await loadOrCreateIdentity(currentUser.userName);
      const key = await deriveConversationKey(identity, recipient.identityPublicKeyJwk);
      const textPayload = await encryptText(key, draft.trim());
      const attachmentPayload = attachment ? await encryptAttachment(key, attachment) : null;

      const hub = hubConnectionRef.current;

      if (!hub || hub.state !== HubConnectionState.Connected) {
        throw new Error("Realtime connection is not ready yet.");
      }

      await hub.invoke("SendEncryptedMessage", {
        conversationId: selectedConversation.id,
        ciphertextBase64: textPayload.ciphertextBase64,
        ivBase64: textPayload.ivBase64,
        encryptionAlgorithm: "AES-256-GCM",
        clientMessageId: crypto.randomUUID(),
        attachment: attachmentPayload
      });

      setDraft("");
      setAttachment(null);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send message.");
    } finally {
      setIsSendingMessage(false);
    }
  }

  function handleLogout() {
    clearSession();
    setAuth(null);
    setCurrentUser(null);
    setConversations([]);
    setSelectedConversationId(null);
    setMessages([]);
  }

  if (!auth || !currentUser) {
    return (
      <main className="min-h-screen px-4 py-6 md:px-8 md:py-8">
        <section className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl overflow-hidden rounded-[2.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent)] shadow-[0_30px_120px_rgba(1,7,18,0.45)] lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative flex flex-col justify-between overflow-hidden p-8 md:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(85,214,190,0.16),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(249,115,96,0.2),transparent_28%)]" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.26em] text-slate-300">
                <Sparkles className="h-4 w-4 text-[var(--accent)]" />
                Secure signaling, local decryption
              </div>
              <h1 className="display-copy mt-8 max-w-2xl text-6xl leading-[0.95] text-white md:text-7xl">
                Private messaging that feels cinematic, not clinical.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
                Cipherline pairs JWT authentication, SignalR delivery, and local ECDH +
                AES-GCM encryption in a modern chat experience.
              </p>
            </div>

            <div className="relative mt-10 grid gap-4 md:grid-cols-3">
              {[
                "BCrypt credentials exchange for API JWT",
                "Client-side ECDH key agreement",
                "Ciphertext-only message and image storage"
              ].map((item) => (
                <div key={item} className="rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-4 text-sm leading-7 text-slate-200">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <AuthPanel
            error={error}
            googleEnabled={GOOGLE_ENABLED}
            isSubmitting={isSigningIn}
            onGoogleError={() => setError("Google sign-in popup failed or was closed.")}
            onGoogleSuccess={handleGoogleSuccess}
            onPasswordSubmit={handlePasswordAuth}
          />
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-3 py-3 md:px-5 md:py-5">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1600px] gap-3 lg:grid-cols-[390px_minmax(0,1fr)]">
        <ChatSidebar
          conversations={conversations}
          currentUser={currentUser}
          isCreatingConversation={isCreatingConversation}
          onCreateConversation={handleCreateConversation}
          onLogout={handleLogout}
          onRecipientUserNameChange={setRecipientUserName}
          onSelectConversation={setSelectedConversationId}
          previewUser={previewUser}
          recipientUserName={recipientUserName}
          selectedConversationId={selectedConversationId}
        />

        <div className="relative">
          <ChatConversationView
            attachment={attachment}
            conversation={selectedConversation}
            currentUser={currentUser}
            draft={draft}
            isSendingMessage={isSendingMessage}
            messages={messages}
            onAttachmentChange={setAttachment}
            onDraftChange={setDraft}
            onSendMessage={handleSendMessage}
          />

          {isLoadingMessages ? (
            <div className="pointer-events-none absolute inset-x-0 top-4 mx-auto w-fit rounded-full border border-white/10 bg-[#0b1727]/90 px-4 py-2 text-sm text-slate-200">
              Decrypting conversation history...
            </div>
          ) : null}

          {error ? (
            <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-[1.2rem] border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );

}

function parseJwt(token: string): { subject: string; email: string; name: string } {
  const payload = token.split(".")[1];

  if (!payload) {
    throw new Error("Google sign-in returned an invalid ID token.");
  }

  const normalized = payload
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(payload.length / 4) * 4, "=");
  const decoded = JSON.parse(window.atob(normalized)) as {
    sub?: string;
    email?: string;
    name?: string;
  };

  if (!decoded.sub) {
    throw new Error("Google sign-in token is missing an account identifier.");
  }

  return {
    subject: decoded.sub,
    email: decoded.email ?? "cipherline",
    name: decoded.name ?? "Cipherline User"
  };
}

function buildUserName(email: string, name: string) {
  const source = email?.split("@", 2)[0] || name;

  return source
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 24);
}

function sortConversations(left: Conversation, right: Conversation) {
  const leftTimestamp = left.lastMessageAtUtc ?? left.createdAtUtc;
  const rightTimestamp = right.lastMessageAtUtc ?? right.createdAtUtc;
  return new Date(rightTimestamp).getTime() - new Date(leftTimestamp).getTime();
}

async function decryptIncomingMessage(
  conversation: Conversation,
  user: UserProfile,
  encryptedMessage: EncryptedMessage
) {
  const identity = await loadOrCreateIdentity(user.userName);
  const recipient = conversation.participants.find((participant) => participant.id !== user.id);

  if (!recipient) {
    throw new Error("Conversation recipient could not be resolved.");
  }

  const key = await deriveConversationKey(identity, recipient.identityPublicKeyJwk);
  return decryptMessage(key, encryptedMessage);
}

function upsertMessage(
  messages: DecryptedMessage[],
  incoming: DecryptedMessage
) {
  const existingIndex = messages.findIndex((message) => message.id === incoming.id);

  if (existingIndex === -1) {
    return [...messages, incoming].sort(
      (left, right) =>
        new Date(left.sentAtUtc).getTime() - new Date(right.sentAtUtc).getTime()
    );
  }

  return messages.map((message) => (message.id === incoming.id ? incoming : message));
}
