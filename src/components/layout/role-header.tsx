import Link from "next/link";

import { signOut } from "@/lib/auth/actions";

export function RoleHeader({
  fullName,
  roleLabel,
  notificationsHref,
  unreadCount,
}: {
  fullName: string;
  roleLabel: string;
  notificationsHref: string;
  unreadCount: number;
}) {
  return (
    <header className="flex items-center justify-between border-b border-foreground/10 px-4 py-3">
      <div className="text-sm">
        <p className="font-medium text-foreground">{fullName}</p>
        <p className="text-xs text-foreground/50">{roleLabel}</p>
      </div>
      <div className="flex items-center gap-4">
        <Link href={notificationsHref} className="relative text-sm text-foreground/70 underline hover:text-foreground">
          Notifications
          {unreadCount > 0 ? (
            <span className="ml-1 rounded-full bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background">
              {unreadCount}
            </span>
          ) : null}
        </Link>
        <form action={signOut}>
          <button type="submit" className="text-sm text-foreground/70 underline hover:text-foreground">
            Déconnexion
          </button>
        </form>
      </div>
    </header>
  );
}
