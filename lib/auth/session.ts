import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function getCurrentSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireCurrentSession() {
  const session = await getCurrentSession();
  if (!session) redirect("/sign-in");
  return session;
}

export async function requireActionSession() {
  const session = await getCurrentSession();
  if (!session) throw new Error("Authentication required");
  return session;
}
