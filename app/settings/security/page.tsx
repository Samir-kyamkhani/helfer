"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { authClient, googleAuthEnabled } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

type SessionResult = Awaited<ReturnType<typeof authClient.listSessions>>;
type SessionRow = NonNullable<SessionResult["data"]>[number];
type AccountResult = Awaited<ReturnType<typeof authClient.listAccounts>>;
type AccountRow = NonNullable<AccountResult["data"]>[number];

export default function SecuritySettingsPage() {
  const router = useRouter();
  const { data: current } = authClient.useSession();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [twoFactorPassword, setTwoFactorPassword] = useState("");
  const [totpUri, setTotpUri] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [totpCode, setTotpCode] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [sessionResult, accountResult] = await Promise.all([
      authClient.listSessions(),
      authClient.listAccounts(),
    ]);
    if (!sessionResult.error) setSessions(sessionResult.data ?? []);
    if (!accountResult.error) setAccounts(accountResult.data ?? []);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([authClient.listSessions(), authClient.listAccounts()]).then(([sessionResult, accountResult]) => {
      if (!active) return;
      if (!sessionResult.error) setSessions(sessionResult.data ?? []);
      if (!accountResult.error) setAccounts(accountResult.data ?? []);
    });
    return () => { active = false; };
  }, []);

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    setError("");
    const result = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });
    if (result.error) setError(result.error.message ?? "Unable to change password.");
    else {
      setNotice("Password changed. Other sessions were signed out.");
      setCurrentPassword("");
      setNewPassword("");
      await refresh();
    }
    setBusy(false);
  };

  const enableTwoFactor = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    const result = await authClient.twoFactor.enable({
      password: twoFactorPassword || undefined,
      issuer: "Helfer",
      method: "totp",
    });
    if (result.error) setError(result.error.message ?? "Unable to set up two-factor authentication.");
    else if (result.data.method === "totp") {
      setTotpUri(result.data.totpURI ?? "");
      setBackupCodes(result.data.backupCodes ?? []);
      setNotice("Add this account to your authenticator app, then enter its six-digit code to finish setup.");
    } else setError("Email verification is not configured for two-factor authentication.");
    setBusy(false);
  };

  const verifyTwoFactor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await authClient.twoFactor.verifyTotp({ code: totpCode });
    if (result.error) setError(result.error.message ?? "That code could not be verified.");
    else {
      setTotpUri("");
      setBackupCodes([]);
      setTotpCode("");
      setNotice("Two-factor authentication is enabled.");
    }
    setBusy(false);
  };

  const disableTwoFactor = async () => {
    setBusy(true);
    setError("");
    const result = await authClient.twoFactor.disable({
      password: twoFactorPassword || undefined,
    });
    if (result.error) setError(result.error.message ?? "Unable to disable two-factor authentication.");
    else {
      setNotice("Two-factor authentication is disabled.");
      setTwoFactorPassword("");
    }
    setBusy(false);
  };

  const linkGoogle = async () => {
    const result = await authClient.linkSocial({
      provider: "google",
      callbackURL: "/settings/security",
    });
    if (result.error) setError(result.error.message ?? "Unable to connect Google.");
  };

  const unlinkAccount = async (accountId: string) => {
    setBusy(true);
    setError("");
    const result = await authClient.unlinkAccount({ accountId });
    if (result.error) setError(result.error.message ?? "Unable to disconnect this account.");
    else await refresh();
    setBusy(false);
  };

  const revokeSession = async (session: SessionRow) => {
    setBusy(true);
    const result = await authClient.revokeSession({ token: session.token });
    if (result.error) setError(result.error.message ?? "Unable to revoke this session.");
    else if (session.token === current?.session.token) {
      await authClient.signOut();
      router.push("/sign-in");
    } else await refresh();
    setBusy(false);
  };

  const revokeOtherSessions = async () => {
    setBusy(true);
    const result = await authClient.revokeOtherSessions();
    if (result.error) setError(result.error.message ?? "Unable to revoke other sessions.");
    else {
      setNotice("All other sessions have been signed out.");
      await refresh();
    }
    setBusy(false);
  };

  const deleteAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (deleteConfirm !== "DELETE") return;
    setBusy(true);
    setError("");
    const result = await authClient.deleteUser({
      callbackURL: "/goodbye",
      ...(deletePassword ? { password: deletePassword } : {}),
    });
    if (result.error) setError(result.error.message ?? "Unable to delete your account.");
    else router.push("/goodbye");
    setBusy(false);
  };

  return (
    <div className="space-y-6">
      {(notice || error) && (
        <p role={error ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm ${error ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-primary/25 bg-primary/5 text-primary"}`}>
          {error || notice}
        </p>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/3 p-6">
        <h2 className="text-xl font-semibold">Password</h2>
        <p className="mt-1 text-sm text-muted-foreground">Changing your password signs out your other active sessions.</p>
        <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={changePassword}>
          <label className="space-y-2 text-sm">
            <span>Current password</span>
            <input className="h-11 w-full rounded-lg border border-white/12 bg-black/15 px-3" autoComplete="current-password" minLength={8} required type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
          </label>
          <label className="space-y-2 text-sm">
            <span>New password</span>
            <input className="h-11 w-full rounded-lg border border-white/12 bg-black/15 px-3" autoComplete="new-password" minLength={8} maxLength={128} required type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
          </label>
          <Button className="sm:col-span-2 sm:w-fit" disabled={busy} type="submit">Change password</Button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/3 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Two-factor authentication</h2>
            <p className="mt-1 text-sm text-muted-foreground">Use an authenticator app for an extra sign-in check.</p>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-muted-foreground">
            {current?.user.twoFactorEnabled ? "Enabled" : "Disabled"}
          </span>
        </div>
        {!current?.user.twoFactorEnabled && !totpUri && (
          <div className="mt-5 flex flex-wrap items-end gap-3">
            <label className="min-w-56 flex-1 space-y-2 text-sm">
              <span>Password (if this account has one)</span>
              <input className="h-11 w-full rounded-lg border border-white/12 bg-black/15 px-3" type="password" value={twoFactorPassword} onChange={(event) => setTwoFactorPassword(event.target.value)} />
            </label>
            <Button disabled={busy} onClick={() => void enableTwoFactor()} type="button">Set up authenticator</Button>
          </div>
        )}
        {totpUri && (
          <div className="mt-5 space-y-4">
            <p className="text-sm text-muted-foreground">Enter the setup URI into your authenticator app. Store these backup codes somewhere safe.</p>
            <code className="block overflow-x-auto rounded-lg bg-black/20 p-3 text-xs">{totpUri}</code>
            {backupCodes.length > 0 && (
              <ul className="grid gap-2 rounded-lg border border-white/8 p-3 font-mono text-sm sm:grid-cols-2">
                {backupCodes.map((code) => <li key={code}>{code}</li>)}
              </ul>
            )}
            <form className="flex flex-wrap gap-3" onSubmit={verifyTwoFactor}>
              <input aria-label="Authenticator code" autoComplete="one-time-code" className="h-11 rounded-lg border border-white/12 bg-black/15 px-3" inputMode="numeric" maxLength={6} minLength={6} required value={totpCode} onChange={(event) => setTotpCode(event.target.value)} />
              <Button disabled={busy} type="submit">Verify and enable</Button>
            </form>
          </div>
        )}
        {current?.user.twoFactorEnabled && (
          <div className="mt-5 flex flex-wrap items-end gap-3">
            <label className="min-w-56 flex-1 space-y-2 text-sm">
              <span>Password (if this account has one)</span>
              <input className="h-11 w-full rounded-lg border border-white/12 bg-black/15 px-3" type="password" value={twoFactorPassword} onChange={(event) => setTwoFactorPassword(event.target.value)} />
            </label>
            <Button disabled={busy} onClick={() => void disableTwoFactor()} type="button" variant="outline">Disable two-factor</Button>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/3 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Connected accounts</h2>
            <p className="mt-1 text-sm text-muted-foreground">Connect Google or review how you sign in.</p>
          </div>
          {googleAuthEnabled && !accounts.some((account) => account.providerId === "google") && (
            <Button onClick={() => void linkGoogle()} type="button" variant="outline">Connect Google</Button>
          )}
        </div>
        <div className="mt-5 divide-y divide-white/8">
          {accounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="font-medium">{account.providerId === "credential" ? "Email and password" : account.providerId}</p>
                <p className="text-xs text-muted-foreground">Connected account</p>
              </div>
              {accounts.length > 1 && (
                <Button disabled={busy} onClick={() => void unlinkAccount(account.id)} type="button" variant="ghost" size="sm">Disconnect</Button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/3 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Active sessions</h2>
            <p className="mt-1 text-sm text-muted-foreground">Sign out of browsers you no longer use.</p>
          </div>
          <Button disabled={busy} onClick={() => void revokeOtherSessions()} type="button" variant="outline">Sign out other sessions</Button>
        </div>
        <div className="mt-5 divide-y divide-white/8">
          {sessions.map((session) => (
            <div key={session.id} className="flex flex-wrap items-center justify-between gap-4 py-3">
              <div>
                <p className="font-medium">{session.token === current?.session.token ? "This device" : session.userAgent || "Active session"}</p>
                <p className="text-xs text-muted-foreground">
                  {session.ipAddress || "IP unavailable"} · Expires {new Date(session.expiresAt).toLocaleString()}
                </p>
              </div>
              <Button disabled={busy} onClick={() => void revokeSession(session)} type="button" variant="ghost" size="sm">Revoke</Button>
            </div>
          ))}
          {sessions.length === 0 && <p className="py-3 text-sm text-muted-foreground">No active sessions found.</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-destructive/20 bg-destructive/3 p-6">
        <h2 className="text-xl font-semibold text-destructive">Delete account</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
          This permanently removes your account and personal data after email confirmation. Transfer ownership or delete any organizations you own first; personal workspaces and sessions are deleted with your account.
        </p>
        <form className="mt-5 grid gap-4 sm:max-w-xl" onSubmit={deleteAccount}>
          <label className="space-y-2 text-sm">
            <span>Type DELETE to confirm</span>
            <input className="h-11 w-full rounded-lg border border-white/12 bg-black/15 px-3" required value={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.value)} />
          </label>
          <label className="space-y-2 text-sm">
            <span>Current password (if this account has one)</span>
            <input className="h-11 w-full rounded-lg border border-white/12 bg-black/15 px-3" autoComplete="current-password" type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} />
          </label>
          <Button className="sm:w-fit" disabled={busy || deleteConfirm !== "DELETE"} type="submit" variant="destructive">Delete account</Button>
        </form>
        <Link className="mt-4 inline-block text-xs text-muted-foreground underline hover:text-foreground" href="/settings/profile">Review your profile first</Link>
      </section>
    </div>
  );
}
