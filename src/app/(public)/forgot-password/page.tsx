import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-1 flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Mot de passe oublié</h1>
        <p className="text-sm text-foreground/60">
          Recevez un lien pour définir un nouveau mot de passe.
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
