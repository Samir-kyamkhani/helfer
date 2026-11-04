import { ProfileSettingsForm } from "@/components/settings/ProfileSettingsForm";
import { requireCurrentSession } from "@/lib/auth/session";

export default async function ProfileSettingsPage() {
  const session = await requireCurrentSession();
  return (
    <ProfileSettingsForm
      key={session.user.id}
      user={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        emailVerified: session.user.emailVerified,
        image: session.user.image ?? null,
      }}
    />
  );
}
