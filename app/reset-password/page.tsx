"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { AuthPageFrame } from "@/components/auth/AuthCard";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      setError("This reset link is missing or expired. Request a new one.");
      return;
    }
    setBusy(true);
    setError("");
    const result = await authClient.resetPassword({ newPassword: password, token });
    if (result.error) setError(result.error.message ?? "Unable to reset password.");
    else setMessage("Your password has been updated. You can sign in now.");
    setBusy(false);
  };

  return (
    <AuthPageFrame>
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white/3 p-6 sm:p-8">
        <h1 className="font-heading text-3xl font-semibold">Choose a new password</h1>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block space-y-2 text-sm">
            <span>New password</span>
            <input
              autoComplete="new-password"
              className="h-11 w-full rounded-lg border border-white/12 bg-black/15 px-3 outline-none focus:border-primary"
              minLength={8}
              maxLength={128}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {message && <p role="status" className="text-sm text-primary">{message}</p>}
          <Button className="h-11 w-full" disabled={busy} type="submit">
            {busy ? "Updating…" : "Update password"}
          </Button>
        </form>
        {message && <Link className="mt-5 block text-center text-sm text-primary" href="/sign-in">Continue to sign in</Link>}
      </section>
    </AuthPageFrame>
  );
}
