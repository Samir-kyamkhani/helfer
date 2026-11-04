"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { authClient, googleAuthEnabled } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

type AuthMode = "sign-in" | "sign-up";

function errorMessage(error: { message?: string } | null | undefined) {
  return error?.message ?? "Something went wrong. Please try again.";
}

export function AuthCard({
  mode,
  callbackUrl = "/dashboard",
}: {
  mode: AuthMode;
  callbackUrl?: string;
}) {
  const router = useRouter();
  const isSignUp = mode === "sign-up";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");

    try {
      if (isSignUp) {
        const result = await authClient.signUp.email({
          name: name.trim(),
          email: email.trim(),
          password,
          callbackURL: callbackUrl,
        });
        if (result.error) throw new Error(errorMessage(result.error));
        setMessage("Check your inbox for a verification link to finish creating your account.");
      } else {
        const result = await authClient.signIn.email({
          email: email.trim(),
          password,
          callbackURL: callbackUrl,
        });
        if (result.error) throw new Error(errorMessage(result.error));
        router.push(callbackUrl);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to authenticate.");
    } finally {
      setBusy(false);
    }
  };

  const signInWithGoogle = async () => {
    setBusy(true);
    setError("");
    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: callbackUrl,
    });
    if (result.error) {
      setError(errorMessage(result.error));
      setBusy(false);
    }
  };

  return (
    <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white/3 p-6 shadow-xl shadow-black/15 sm:p-8">
      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
          Helfer account
        </p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">
          {isSignUp ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {isSignUp
            ? "Sign up to start a personal workspace or join your team."
            : "Sign in to continue to your workspace."}
        </p>
      </div>

      {googleAuthEnabled && (
        <Button
          type="button"
          variant="outline"
          className="mb-5 h-11 w-full border-white/12 bg-transparent"
          disabled={busy}
          onClick={() => void signInWithGoogle()}
        >
          Continue with Google
        </Button>
      )}

      <form className="space-y-4" onSubmit={submit}>
        {isSignUp && (
          <label className="block space-y-2 text-sm">
            <span>Name</span>
            <input
              autoComplete="name"
              className="h-11 w-full rounded-lg border border-white/12 bg-black/15 px-3 outline-none focus:border-primary"
              maxLength={100}
              minLength={2}
              onChange={(event) => setName(event.target.value)}
              required
              value={name}
            />
          </label>
        )}
        <label className="block space-y-2 text-sm">
          <span>Email</span>
          <input
            autoComplete="email"
            className="h-11 w-full rounded-lg border border-white/12 bg-black/15 px-3 outline-none focus:border-primary"
            maxLength={254}
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label className="block space-y-2 text-sm">
          <span>Password</span>
          <input
            autoComplete={isSignUp ? "new-password" : "current-password"}
            className="h-11 w-full rounded-lg border border-white/12 bg-black/15 px-3 outline-none focus:border-primary"
            maxLength={128}
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {message && <p role="status" className="text-sm text-primary">{message}</p>}

        <Button type="submit" className="h-11 w-full" disabled={busy}>
          {busy ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
        </Button>
      </form>

      {!isSignUp && (
        <div className="mt-4 flex justify-between text-sm text-muted-foreground">
          <Link className="hover:text-foreground" href="/forgot-password">
            Forgot password?
          </Link>
          <Link className="hover:text-foreground" href="/verify-email">
            Resend verification
          </Link>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isSignUp ? "Already have an account? " : "New to Helfer? "}
        <Link
          className="font-medium text-foreground underline-offset-4 hover:underline"
          href={isSignUp ? "/sign-in" : "/sign-up"}
        >
          {isSignUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </section>
  );
}

export function AuthPageFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-5 py-16">
      {children}
    </main>
  );
}
