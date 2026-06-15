"use client";

import type { CredentialResponse } from "@react-oauth/google";
import { GoogleLogin } from "@react-oauth/google";
import { KeyRound, LoaderCircle, UserPlus } from "lucide-react";
import { useState } from "react";

export type PasswordAuthRequest = {
  mode: "login" | "register";
  userName: string;
  displayName: string;
  password: string;
};

type AuthPanelProps = {
  error: string | null;
  googleEnabled: boolean;
  isSubmitting: boolean;
  onGoogleError: () => void;
  onGoogleSuccess: (credential: CredentialResponse) => void;
  onPasswordSubmit: (request: PasswordAuthRequest) => void;
};

export function AuthPanel({
  error,
  googleEnabled,
  isSubmitting,
  onGoogleError,
  onGoogleSuccess,
  onPasswordSubmit
}: AuthPanelProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [userName, setUserName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="glass-panel m-4 flex flex-col justify-center rounded-[2.1rem] p-8 md:m-6 md:p-10">
      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Secure access</p>
      <h2 className="display-copy mt-4 text-4xl text-white">
        {mode === "login" ? "Open your encrypted workspace." : "Create your secure identity."}
      </h2>
      <p className="mt-4 text-sm leading-7 text-slate-300">
        Your P-256 private key stays in this browser. Google or your password verifies
        your identity, then the API issues the JWT used by the chat app.
      </p>

      <div className="mt-7 grid grid-cols-2 rounded-full border border-white/10 bg-black/10 p-1">
        {(["login", "register"] as const).map((item) => (
          <button
            key={item}
            className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
              mode === item ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
            }`}
            onClick={() => setMode(item)}
            type="button"
          >
            {item === "login" ? "Sign in" : "Register"}
          </button>
        ))}
      </div>

      <form
        className="mt-5 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          onPasswordSubmit({
            mode,
            userName: userName.trim().toLowerCase(),
            displayName: displayName.trim(),
            password
          });
        }}
      >
        {mode === "register" ? (
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-[0.18em] text-slate-400">
              Display name
            </span>
            <input
              autoComplete="name"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-[var(--mint)]/60"
              maxLength={64}
              minLength={2}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Anas Ahmed"
              required
              value={displayName}
            />
          </label>
        ) : null}

        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-[0.18em] text-slate-400">
            Username
          </span>
          <input
            autoComplete="username"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-[var(--mint)]/60"
            maxLength={32}
            minLength={3}
            onChange={(event) => setUserName(event.target.value)}
            pattern="[A-Za-z0-9_-]{3,32}"
            placeholder="anas_ahmed"
            required
            value={userName}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-[0.18em] text-slate-400">
            Password
          </span>
          <input
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-[var(--mint)]/60"
            maxLength={128}
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            required
            type="password"
            value={password}
          />
        </label>

        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--mint)] px-5 py-3.5 font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : mode === "login" ? (
            <KeyRound className="h-4 w-4" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          {mode === "login" ? "Sign in securely" : "Create secure account"}
        </button>
      </form>

      {googleEnabled ? (
        <>
          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-slate-500">
            <span className="h-px flex-1 bg-white/10" />
            or
            <span className="h-px flex-1 bg-white/10" />
          </div>
          <div className="flex justify-center">
            <GoogleLogin
              onError={onGoogleError}
              onSuccess={onGoogleSuccess}
              shape="pill"
              size="large"
              text={mode === "register" ? "signup_with" : "signin_with"}
              theme="outline"
            />
          </div>
          <p className="mt-3 text-center text-xs leading-5 text-slate-400">
            Google sign-in automatically creates your account the first time.
          </p>
        </>
      ) : (
        <div className="mt-5 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
          Google sign-up is ready but needs a Google OAuth web client ID in
          <code className="ml-1">frontend/.env.local</code> and the backend configuration.
        </div>
      )}

      {error ? (
        <div className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm leading-6 text-rose-100">
          {error}
        </div>
      ) : null}
    </div>
  );
}
