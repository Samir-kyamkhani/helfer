import { Suspense } from "react";
import { checkUser } from "@/actions/check-user";
import { redirect } from "next/navigation";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const user = await checkUser();

  if (!user) redirect("/sign-in");

  return <div>DashboardPage</div>;
}
