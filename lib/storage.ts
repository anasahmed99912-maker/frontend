import type { AuthResponse } from "@/lib/types";

const SESSION_KEY = "cipherline.session.v1";
const LEGACY_IDENTITY_KEY = "cipherline.identity.v1";
const IDENTITY_KEY_PREFIX = "cipherline.identity.v2.";
const SELECTED_CONVERSATION_KEY_PREFIX = "cipherline.selected-conversation.v1.";

export type StoredIdentity = {
  publicJwk: JsonWebKey;
  privateJwk: JsonWebKey;
};

export function loadSession(): AuthResponse | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as AuthResponse) : null;
}

export function saveSession(value: AuthResponse) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(value));
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
}

export function loadIdentity(owner: string): StoredIdentity | null {
  if (typeof window === "undefined") {
    return null;
  }

  const key = getIdentityKey(owner);
  const raw = window.localStorage.getItem(key);

  if (raw) {
    return parseStoredIdentity(raw);
  }

  const legacy = window.localStorage.getItem(LEGACY_IDENTITY_KEY);

  if (!legacy) {
    return null;
  }

  const identity = parseStoredIdentity(legacy);

  if (identity) {
    saveIdentity(owner, identity);
    window.localStorage.removeItem(LEGACY_IDENTITY_KEY);
  }

  return identity;
}

export function saveIdentity(owner: string, identity: StoredIdentity) {
  window.localStorage.setItem(getIdentityKey(owner), JSON.stringify(identity));
}

export function loadSelectedConversationId(owner: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (!owner.trim()) {
    return null;
  }

  return window.localStorage.getItem(getSelectedConversationKey(owner));
}

export function saveSelectedConversationId(owner: string, conversationId: string) {
  if (!owner.trim()) {
    return;
  }

  window.localStorage.setItem(getSelectedConversationKey(owner), conversationId);
}

export function clearSelectedConversationId(owner: string) {
  if (!owner.trim()) {
    return;
  }

  window.localStorage.removeItem(getSelectedConversationKey(owner));
}

function getIdentityKey(owner: string) {
  return `${IDENTITY_KEY_PREFIX}${owner.trim().toLowerCase()}`;
}

function getSelectedConversationKey(owner: string) {
  return `${SELECTED_CONVERSATION_KEY_PREFIX}${owner.trim().toLowerCase()}`;
}

function parseStoredIdentity(raw: string) {
  try {
    return JSON.parse(raw) as StoredIdentity;
  } catch {
    return null;
  }
}
