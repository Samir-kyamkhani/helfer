"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { AuthPageFrame } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";

export default function VerifyTwoFactorPage() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await authClient.twoFactor.verifyTotp({ code });
    if (result.error) setError(result.error.message ?? "That code could not be verified.");
    else {
      const callbackURL = searchParams.get("callbackURL");
      const safePath = callbackURL?.startsWith("/") && !callbackURL.startsWith("//")
        ? callbackURL
        : "/dashboard";
      window.location.assign(safePath);
    }
    setBusy(false);
  };

  return (
    <AuthPageFrame>
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white/3 p-6 sm:p-8">
        <h1 className="font-heading text-3xl font-semibold">Verify your sign-in</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Enter the current code from your authenticator app.
        </p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <input
            aria-label="Authenticator code"
            autoComplete="one-time-code"
            className="h-12 w-full rounded-lg border border-white/12 bg-black/15 px-3 text-center font-mono text-lg tracking-[0.4em]"
            inputMode="numeric"
            maxLength={6}
            minLength={6}
            required
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button className="h-11 w-full" disabled={busy} type="submit">{busy ? "Checking…" : "Verify code"}</Button>
        </form>
      </section>
    </AuthPageFrame>
  );
}
