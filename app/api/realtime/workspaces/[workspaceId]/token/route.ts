import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { getWorkspaceAccess } from "@/lib/workspace-access";
import { getCurrentSession } from "@/lib/auth/session";

function signWorkspaceToken(userId: string, workspaceId: string, secret: string) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const claims = Buffer.from(JSON.stringify({
    aud: "authenticated",
    role: "authenticated",
    sub: userId,
    workspace_id: workspaceId,
    iat: issuedAt,
    exp: issuedAt + 300,
  })).toString("base64url");
  const content = `${header}.${claims}`;
  const signature = createHmac("sha256", secret).update(content).digest("base64url");
  return `${content}.${signature}`;
}

export async function GET(_request: Request, context: { params: Promise<{ workspaceId: string }> }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { workspaceId } = await context.params;
  if (!(await getWorkspaceAccess(workspaceId))) return NextResponse.json({ error: "Workspace access denied." }, { status: 404 });
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) return NextResponse.json({ error: "Secure collaboration is not configured." }, { status: 503 });
  return NextResponse.json(
    { token: signWorkspaceToken(session.user.id, workspaceId, secret) },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
