import { redirect } from "next/navigation";

import { getViewer } from "@/lib/auth/session";
import { dashboardPathForRole } from "@/lib/auth/redirect-by-role";

import { signInWithGoogle } from "./actions";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
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

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <LoginForm next={next} />

      <div className="flex items-center gap-3 text-xs text-foreground/40">
        <span className="h-px flex-1 bg-foreground/10" />
        ou
        <span className="h-px flex-1 bg-foreground/10" />
      </div>

      <form action={signInWithGoogle.bind(null, next)}>
        <button
          type="submit"
          className="flex w-full max-w-sm items-center justify-center gap-2 rounded-md border border-foreground/15 px-3 py-2.5 text-sm font-medium text-foreground"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.26v3.11A11.99 11.99 0 0 0 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.6H1.26a12 12 0 0 0 0 10.8l4.01-3.11Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.76 0 3.34.6 4.59 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.26 6.6l4.01 3.11C6.22 6.86 8.87 4.75 12 4.75Z"
            />
          </svg>
          Continuer avec Google
        </button>
      </form>
    </div>
  );
}
