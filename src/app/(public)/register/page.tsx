import { redirect } from "next/navigation";

import { getViewer } from "@/lib/auth/session";
import { dashboardPathForRole } from "@/lib/auth/redirect-by-role";

import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
  const viewer = await getViewer();

  if (viewer.role !== "visitor") {
    redirect(dashboardPathForRole(viewer.role));
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-1 flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Créer un compte</h1>
        <p className="text-sm text-foreground/60">Client ou propriétaire/gérant.</p>
      </div>
      <RegisterForm />
    </div>
  );
}
