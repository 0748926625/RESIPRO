import { createClient } from "@/lib/supabase/server";

import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const supabase = await createClient();

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-sm flex-1 flex-col justify-center gap-4 px-4 text-center">
        <h1 className="text-xl font-semibold text-foreground">Lien invalide ou expiré</h1>
        <p className="text-sm text-foreground/60">
          Redemandez un lien de réinitialisation depuis la page mot de passe oublié.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-1 flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Nouveau mot de passe</h1>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
