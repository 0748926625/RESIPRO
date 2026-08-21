import Link from "next/link";
import type { ReactNode } from "react";

import { dashboardPathForRole } from "@/lib/auth/redirect-by-role";
import { getViewer } from "@/lib/auth/session";

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const viewer = await getViewer();

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-foreground/10 bg-card px-4 py-3">
        <Link href="/" className="text-base font-semibold text-primary">
          ResiPro
        </Link>
        <div className="flex items-center gap-2 text-sm">
          {viewer.role === "visitor" ? (
            <>
              <Link
                href="/login"
                className="flex h-10 items-center rounded-md px-3 text-foreground/70 hover:text-foreground"
              >
                Se connecter
              </Link>
              <Link
                href="/register"
                className="flex h-10 items-center rounded-md bg-primary px-3.5 font-medium text-primary-foreground"
              >
                S&apos;inscrire
              </Link>
            </>
          ) : (
            <Link
              href={dashboardPathForRole(viewer.role)}
              className="flex h-10 items-center rounded-md bg-primary px-3.5 font-medium text-primary-foreground"
            >
              Mon espace
            </Link>
          )}
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
