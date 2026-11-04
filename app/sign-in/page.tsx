import { AuthCard, AuthPageFrame } from "@/components/auth/AuthCard";

function safeCallback(value: string | string[] | undefined) {
  const path = Array.isArray(value) ? value[0] : value;
  return path?.startsWith("/") && !path.startsWith("//") ? path : "/dashboard";
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const query = await searchParams;
  return (
    <AuthPageFrame>
      <AuthCard mode="sign-in" callbackUrl={safeCallback(query.next)} />
    </AuthPageFrame>
  );
}
