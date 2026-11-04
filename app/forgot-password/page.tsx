"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { AuthPageFrame } from "@/components/auth/AuthCard";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const result = await authClient.requestPasswordReset({
      email: email.trim(),
      redirectTo: "/reset-password",
    });
    if (result.error) setError(result.error.message ?? "Unable to request a reset link.");
    else setMessage("If that address has an account, a password reset link is on its way.");
    setBusy(false);
  };

  return (
    <AuthPageFrame>
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white/3 p-6 sm:p-8">
        <h1 className="font-heading text-3xl font-semibold">Reset your password</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Enter the email on your account and we’ll send a secure reset link.
        </p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block space-y-2 text-sm">
            <span>Email</span>
            <input
              autoComplete="email"
              className="h-11 w-full rounded-lg border border-white/12 bg-black/15 px-3 outline-none focus:border-primary"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {message && <p role="status" className="text-sm text-primary">{message}</p>}
          <Button className="h-11 w-full" disabled={busy} type="submit">
            {busy ? "Sending…" : "Send reset link"}
          </Button>
        </form>
        <Link className="mt-5 block text-center text-sm text-muted-foreground hover:text-foreground" href="/sign-in">
          Back to sign in
        </Link>
      </section>
    </AuthPageFrame>
  );
}
