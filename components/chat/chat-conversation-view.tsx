"use client";

import { Check, ImagePlus, LoaderCircle, Lock, Pencil, SendHorizontal, Trash2, X } from "lucide-react";
import type { Conversation, DecryptedMessage, UserProfile } from "@/lib/types";

type ChatConversationViewProps = {
  currentUser: UserProfile;
  conversation: Conversation | null;
  messages: DecryptedMessage[];
  draft: string;
  onDraftChange: (value: string) => void;
  onAttachmentChange: (file: File | null) => void;
  attachment: File | null;
  onSendMessage: () => void;
  isSendingMessage: boolean;
  editingMessageId: string | null;
  editingDraft: string;
  onEditingDraftChange: (value: string) => void;
  onStartEditingMessage: (message: DecryptedMessage) => void;
  onCancelEditingMessage: () => void;
  onSaveEditingMessage: () => void;
  onDeleteMessage: (message: DecryptedMessage) => void;
  isUpdatingMessage: boolean;
  deletingMessageId: string | null;
};

export function ChatConversationView({
  currentUser,
  conversation,
  messages,
  draft,
  onDraftChange,
  onAttachmentChange,
  attachment,
  onSendMessage,
  isSendingMessage,
  editingMessageId,
  editingDraft,
  onEditingDraftChange,
  onStartEditingMessage,
  onCancelEditingMessage,
  onSaveEditingMessage,
  onDeleteMessage,
  isUpdatingMessage,
  deletingMessageId
}: ChatConversationViewProps) {
  const counterpart = conversation?.participants.find(
    (participant) => participant.id !== currentUser.id
  );

  if (!conversation || !counterpart) {
    return (
      <section className="glass-panel flex h-full flex-col items-center justify-center rounded-[2.2rem] border px-8 text-center">
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.28em] text-slate-300">
          Welcome to Cipherline
        </div>
        <h2 className="display-copy mt-6 max-w-2xl text-5xl text-white">
          Build a private room and start a modern secure conversation.
        </h2>
        <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
          Search for a username on the left, open a secure thread, and send encrypted text or images.
        </p>
      </section>
    );
  }

  return (
    <section className="glass-panel flex h-full flex-col rounded-[2.2rem] border">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-5">
        <div className="flex items-center gap-4">
          <img
            alt={counterpart.displayName}
            className="h-14 w-14 rounded-[1.4rem] object-cover"
            src={counterpart.avatarUrl || `https://ui-avatars.com/api/?name=${counterpart.displayName}&background=10253a&color=fff`}
          />
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Direct encrypted room</p>
            <h2 className="display-copy text-3xl text-white">{counterpart.displayName}</h2>
            <p className="text-sm text-slate-300">@{counterpart.userName}</p>
          </div>
        </div>
        <div className="hidden rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-emerald-200 md:flex md:items-center md:gap-2">
          <Lock className="h-4 w-4" />
          SignalR live
        </div>
      </header>

      <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-5 py-6 md:px-7">
        {messages.map((message) => {
          const isCurrentUser = message.senderUserId === currentUser.id;
          const isEditing = editingMessageId === message.id;
          const isDeleting = deletingMessageId === message.id;

          return (
            <article
              key={message.id}
              className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[82%] rounded-[1.8rem] px-5 py-4 shadow-lg ${
                  isCurrentUser
                    ? "bg-[var(--accent)] text-white"
                    : "border border-white/10 bg-white/[0.06] text-slate-100"
                }`}
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <textarea
                      className="min-h-24 w-full resize-none rounded-[1.2rem] border border-white/15 bg-black/15 px-3 py-2 text-[15px] leading-7 text-white outline-none"
                      onChange={(event) => onEditingDraftChange(event.target.value)}
                      value={editingDraft}
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-sm text-white/90 transition hover:bg-white/10"
                        onClick={onCancelEditingMessage}
                        type="button"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </button>
                      <button
                        className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-60"
                        disabled={isUpdatingMessage}
                        onClick={onSaveEditingMessage}
                        type="button"
                      >
                        {isUpdatingMessage ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        Save
                      </button>
                    </div>
                  </div>
                ) : message.text ? (
                  <p className="whitespace-pre-wrap text-[15px] leading-7">{message.text}</p>
                ) : null}

                {message.attachmentUrl && message.attachmentMimeType?.startsWith("image/") ? (
                  <a
                    className="mt-3 block overflow-hidden rounded-[1.25rem] border border-white/10"
                    href={message.attachmentUrl}
                    target="_blank"
                  >
                    <img
                      alt={message.attachmentName || "Shared image"}
                      className="max-h-80 w-full object-cover"
                      src={message.attachmentUrl}
                    />
                  </a>
                ) : null}

                {message.attachmentUrl && !message.attachmentMimeType?.startsWith("image/") ? (
                  <a
                    className="mt-3 inline-block rounded-full border border-white/15 px-3 py-2 text-sm text-white/90"
                    download={message.attachmentName}
                    href={message.attachmentUrl}
                    target="_blank"
                  >
                    {message.attachmentName}
                  </a>
                ) : null}

                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className={`text-xs ${isCurrentUser ? "text-white/80" : "text-slate-400"}`}>
                    {new Date(message.sentAtUtc).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                    {message.updatedAtUtc ? "  edited" : ""}
                  </p>

                  {isCurrentUser && !isEditing ? (
                    <div className="flex items-center gap-2">
                      <button
                        className="inline-flex items-center justify-center rounded-full border border-white/15 p-2 text-white/80 transition hover:bg-white/10"
                        onClick={() => onStartEditingMessage(message)}
                        type="button"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="inline-flex items-center justify-center rounded-full border border-white/15 p-2 text-white/80 transition hover:bg-white/10 disabled:opacity-60"
                        disabled={isDeleting}
                        onClick={() => onDeleteMessage(message)}
                        type="button"
                      >
                        {isDeleting ? (
                          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <footer className="border-t border-white/10 px-4 py-4 md:px-6">
        <div className="rounded-[1.8rem] border border-white/10 bg-black/[0.12] p-3">
          <textarea
            className="min-h-28 w-full resize-none bg-transparent px-3 py-2 text-base text-white outline-none placeholder:text-slate-500"
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder="Write an encrypted message..."
            value={draft}
          />
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
              <ImagePlus className="h-4 w-4" />
              {attachment ? attachment.name : "Attach image"}
              <input
                accept="image/*"
                className="hidden"
                onChange={(event) => onAttachmentChange(event.target.files?.[0] ?? null)}
                type="file"
              />
            </label>

            <button
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--mint)] px-5 py-3 font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-60"
              disabled={isSendingMessage}
              onClick={onSendMessage}
              type="button"
            >
              {isSendingMessage ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <SendHorizontal className="h-4 w-4" />
              )}
              Send secure message
            </button>
          </div>
        </div>
      </footer>
    </section>
  );
}
