import { AuthCard, AuthPageFrame } from "@/components/auth/AuthCard";
import { redirectIfAuthenticated } from "@/lib/auth/session";

export default async function SignUpPage() {
  await redirectIfAuthenticated();

  return (
    <AuthPageFrame>
      <AuthCard mode="sign-up" />
    </AuthPageFrame>
  );
}
