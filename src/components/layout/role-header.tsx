import Link from "next/link";

import { signOut } from "@/lib/auth/actions";

import { MobileNav } from "./mobile-nav";

export function RoleHeader({
  fullName,
  roleLabel,
  notificationsHref,
  unreadCount,
  navItems,
}: {
  fullName: string;
  roleLabel: string;
  notificationsHref: string;
  unreadCount: number;
  navItems: { label: string; href: string }[];
}) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-foreground/10 bg-card px-3 py-2.5 sm:px-4">
      <div className="flex items-center gap-2">
        <MobileNav items={navItems} />
        <div className="text-sm">
          <p className="font-medium text-foreground">{fullName}</p>
          <p className="text-xs text-foreground/50">{roleLabel}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <Link
          href={notificationsHref}
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-foreground/70 hover:bg-muted hover:text-foreground sm:h-auto sm:w-auto sm:rounded-md sm:px-1 sm:text-sm sm:underline"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 sm:hidden">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"
            />
          </svg>
          <span className="hidden sm:inline">Notifications</span>
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground sm:static sm:ml-1 sm:h-auto sm:min-w-0 sm:rounded-full sm:px-1.5 sm:py-0.5">
              {unreadCount}
            </span>
          ) : null}
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="h-10 rounded-md px-2 text-sm text-foreground/70 hover:text-foreground sm:h-auto sm:px-0 sm:underline"
          >
            Déconnexion
          </button>
        </form>
      </div>
    </header>
  );
}
