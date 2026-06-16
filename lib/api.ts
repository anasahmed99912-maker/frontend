import type { AuthResponse, Conversation, EncryptedMessage, UserProfile } from "@/lib/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "https://backend-production-ff9f.up.railway.app";

type JsonBody = Record<string, unknown>;

async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  token?: string
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers
    });
  } catch {
    throw new Error(
      `The browser could not read the API response from ${API_BASE_URL}. Check that the backend is online and allows this frontend origin.`
    );
  }

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    throw new Error(error?.error ?? `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function signInWithGoogle(
  idToken: string,
  preferredUserName: string,
  identityPublicKeyJwk: string
) {
  return apiFetch<AuthResponse>("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({
      idToken,
      preferredUserName,
      identityPublicKeyJwk
    } satisfies JsonBody)
  });
}

export async function registerUser(
  userName: string,
  displayName: string,
  password: string,
  identityPublicKeyJwk: string
) {
  return apiFetch<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      userName,
      displayName,
      password,
      identityPublicKeyJwk
    } satisfies JsonBody)
  });
}

export async function loginUser(
  userName: string,
  password: string,
  identityPublicKeyJwk: string
) {
  return apiFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      userName,
      password,
      identityPublicKeyJwk
    } satisfies JsonBody)
  });
}

export async function getCurrentUser(token: string) {
  return apiFetch<UserProfile>("/api/auth/me", {}, token);
}

export async function listConversations(token: string) {
  return apiFetch<Conversation[]>("/api/conversations", {}, token);
}

export async function createConversation(token: string, recipientUserName: string) {
  return apiFetch<Conversation>("/api/conversations", {
    method: "POST",
    body: JSON.stringify({
      recipientUserName
    } satisfies JsonBody)
  }, token);
}

export async function listMessages(token: string, conversationId: string) {
  return apiFetch<EncryptedMessage[]>(`/api/conversations/${conversationId}/messages`, {}, token);
}

export async function lookupUser(token: string, userName: string) {
  return apiFetch<UserProfile>(`/api/users/${encodeURIComponent(userName)}`, {}, token);
}

export async function searchUsers(token: string, query: string) {
  return apiFetch<UserProfile[]>(`/api/users?query=${encodeURIComponent(query)}`, {}, token);
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}
