export type UserProfile = {
  id: string;
  userName: string;
  displayName: string;
  identityPublicKeyJwk: string;
  email?: string | null;
  avatarUrl?: string | null;
};

export type AuthResponse = {
  token: string;
  expiresAtUtc: string;
  user: UserProfile;
};

export type Conversation = {
  id: string;
  type: string;
  participantIds: string[];
  participants: UserProfile[];
  createdAtUtc: string;
  lastMessageAtUtc?: string | null;
};

export type EncryptedAttachment = {
  fileName: string;
  mimeType: string;
  ciphertextBase64: string;
  ivBase64: string;
  sizeBytes: number;
};

export type EncryptedMessage = {
  id: string;
  conversationId: string;
  senderUserId: string;
  ciphertextBase64: string;
  ivBase64: string;
  encryptionAlgorithm: string;
  clientMessageId?: string | null;
  attachment?: EncryptedAttachment | null;
  sentAtUtc: string;
};

export type DecryptedMessage = {
  id: string;
  conversationId: string;
  senderUserId: string;
  text: string;
  sentAtUtc: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentMimeType?: string;
};
