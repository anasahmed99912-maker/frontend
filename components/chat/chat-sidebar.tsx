"use client";

import clsx from "clsx";
import { LoaderCircle, LogOut, Plus, Search, ShieldCheck } from "lucide-react";
import type { Conversation, UserProfile } from "@/lib/types";

type ChatSidebarProps = {
  conversations: Conversation[];
  currentUser: UserProfile;
  previewUser: UserProfile | null;
  recipientUserName: string;
  onRecipientUserNameChange: (value: string) => void;
  onCreateConversation: () => void;
  isCreatingConversation: boolean;
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onLogout: () => void;
};

export function ChatSidebar({
  conversations,
  currentUser,
  previewUser,
  recipientUserName,
  onRecipientUserNameChange,
  onCreateConversation,
  isCreatingConversation,
  selectedConversationId,
  onSelectConversation,
  onLogout
}: ChatSidebarProps) {
  return (
    <aside className="glass-panel flex h-full flex-col rounded-[2rem] border p-5">
      <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-cyan-100/55">Cipherline</p>
          <h1 className="display-copy mt-2 text-3xl text-white">Private rooms, fast relay.</h1>
        </div>
        <button
          className="rounded-full border border-white/10 bg-white/5 p-3 text-slate-200 transition hover:bg-white/10"
          onClick={onLogout}
          type="button"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-3">
          <img
            alt={currentUser.displayName}
            className="h-12 w-12 rounded-2xl object-cover ring-1 ring-white/10"
            src={currentUser.avatarUrl || `https://ui-avatars.com/api/?name=${currentUser.displayName}&background=10253a&color=fff`}
          />
          <div>
            <p className="font-semibold text-white">{currentUser.displayName}</p>
            <p className="text-sm text-slate-300">@{currentUser.userName}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-2 text-xs tracking-[0.22em] text-emerald-200 uppercase">
          <ShieldCheck className="h-4 w-4" />
          E2EE active
        </div>
      </div>

      <div className="mt-5 rounded-[1.7rem] border border-white/10 bg-[#0c1b2e]/80 p-4">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/10 px-4 py-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            onChange={(event) => onRecipientUserNameChange(event.target.value)}
            placeholder="Find user by username"
            value={recipientUserName}
          />
        </div>

        {previewUser ? (
          <div className="mt-4 rounded-[1.4rem] border border-[var(--accent)]/25 bg-[var(--accent-soft)] p-4">
            <div className="flex items-center gap-3">
              <img
                alt={previewUser.displayName}
                className="h-11 w-11 rounded-2xl object-cover"
                src={previewUser.avatarUrl || `https://ui-avatars.com/api/?name=${previewUser.displayName}&background=f97360&color=fff`}
              />
              <div>
                <p className="font-semibold text-white">{previewUser.displayName}</p>
                <p className="text-sm text-slate-200">@{previewUser.userName}</p>
              </div>
            </div>
            <button
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
              disabled={isCreatingConversation}
              onClick={onCreateConversation}
              type="button"
            >
              {isCreatingConversation ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Start secure thread
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex-1 overflow-hidden">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Conversations</p>
          <p className="text-sm text-slate-400">{conversations.length}</p>
        </div>
        <div className="scrollbar-thin flex h-full flex-col gap-3 overflow-y-auto pr-1">
          {conversations.map((conversation) => {
            const counterpart = conversation.participants.find(
              (participant) => participant.id !== currentUser.id
            );

            return (
              <button
                key={conversation.id}
                className={clsx(
                  "rounded-[1.5rem] border px-4 py-4 text-left transition",
                  selectedConversationId === conversation.id
                    ? "border-white/20 bg-white/10"
                    : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]"
                )}
                onClick={() => onSelectConversation(conversation.id)}
                type="button"
              >
                <div className="flex items-center gap-3">
                  <img
                    alt={counterpart?.displayName || "Conversation"}
                    className="h-12 w-12 rounded-2xl object-cover"
                    src={counterpart?.avatarUrl || `https://ui-avatars.com/api/?name=${counterpart?.displayName || "Secure"}&background=11253f&color=fff`}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">
                      {counterpart?.displayName || "Unknown contact"}
                    </p>
                    <p className="truncate text-sm text-slate-400">
                      @{counterpart?.userName || "removed-user"}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
