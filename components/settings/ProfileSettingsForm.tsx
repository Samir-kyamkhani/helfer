"use client";

import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

type ProfileUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
};

export function ProfileSettingsForm({ user }: { user: ProfileUser }) {
  const [name, setName] = useState(user.name);
  const [image, setImage] = useState(user.image ?? "");
  const [email, setEmail] = useState(user.email);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    setError("");
    if (image && !/^https:\/\//i.test(image)) {
      setError("Profile image URLs must use HTTPS.");
      setBusy(false);
      return;
    }
    const result = await authClient.updateUser({
      name: name.trim(),
      image: image.trim() || null,
    });
    if (result.error) setError(result.error.message ?? "Unable to update your profile.");
    else setNotice("Profile updated.");
    setBusy(false);
  };

  const updateEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    setError("");
    const result = await authClient.changeEmail({
      newEmail: email.trim(),
      callbackURL: "/settings/profile",
    });
    if (result.error) setError(result.error.message ?? "Unable to request an email change.");
    else setNotice("Check your current email for a confirmation link. The address changes after confirmation.");
    setBusy(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-white/10 bg-white/3 p-6">
        <h2 className="text-xl font-semibold">Profile information</h2>
        <p className="mt-1 text-sm text-muted-foreground">Update your name and profile image.</p>
        <form className="mt-6 space-y-4" onSubmit={saveProfile}>
          <label className="block space-y-2 text-sm">
            <span>Name</span>
            <input className="h-11 w-full rounded-lg border border-white/12 bg-black/15 px-3 outline-none focus:border-primary" maxLength={100} minLength={2} onChange={(event) => setName(event.target.value)} required value={name} />
          </label>
          <label className="block space-y-2 text-sm">
            <span>Profile image URL</span>
            <input className="h-11 w-full rounded-lg border border-white/12 bg-black/15 px-3 outline-none focus:border-primary" onChange={(event) => setImage(event.target.value)} placeholder="https://example.com/avatar.png" type="url" value={image} />
            <span className="block text-xs text-muted-foreground">Use a public HTTPS image URL.</span>
          </label>
          {(notice || error) && <p role={error ? "alert" : "status"} className={`text-sm ${error ? "text-destructive" : "text-primary"}`}>{error || notice}</p>}
          <Button disabled={busy} type="submit">{busy ? "Saving…" : "Save profile"}</Button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/3 p-6">
        <h2 className="text-xl font-semibold">Email address</h2>
        <p className="mt-1 text-sm text-muted-foreground">Your new address is saved only after you confirm the change by email.</p>
        <form className="mt-6 space-y-4" onSubmit={updateEmail}>
          <label className="block space-y-2 text-sm">
            <span>Email</span>
            <input autoComplete="email" className="h-11 w-full rounded-lg border border-white/12 bg-black/15 px-3 outline-none focus:border-primary" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
          </label>
          <p className="text-xs text-muted-foreground">Current address: {user.email} ({user.emailVerified ? "verified" : "not verified"})</p>
          {(notice || error) && <p role={error ? "alert" : "status"} className={`text-sm ${error ? "text-destructive" : "text-primary"}`}>{error || notice}</p>}
          <Button disabled={busy || email === user.email} type="submit">{busy ? "Sending…" : "Request email change"}</Button>
        </form>
      </section>
    </div>
  );
}
