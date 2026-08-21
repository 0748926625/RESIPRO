import { redirect } from "next/navigation";

import { getViewer } from "@/lib/auth/session";
import { dashboardPathForRole } from "@/lib/auth/redirect-by-role";

import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const viewer = await getViewer();

  if (viewer.role !== "visitor") {
    redirect(dashboardPathForRole(viewer.role));
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-1 flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Connexion</h1>
        <p className="text-sm text-foreground/60">Accédez à votre espace ResiPro.</p>
      </div>
      <LoginForm next={next} />
    </div>
  );
}
