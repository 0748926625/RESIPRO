import { signOut } from "@/lib/auth/actions";

export function RoleHeader({ fullName, roleLabel }: { fullName: string; roleLabel: string }) {
  return (
    <header className="flex items-center justify-between border-b border-foreground/10 px-4 py-3">
      <div className="text-sm">
        <p className="font-medium text-foreground">{fullName}</p>
        <p className="text-xs text-foreground/50">{roleLabel}</p>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          className="text-sm text-foreground/70 underline hover:text-foreground"
        >
          Déconnexion
        </button>
      </form>
    </header>
  );
}
