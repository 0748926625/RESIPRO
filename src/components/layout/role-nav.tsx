"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function RoleNav({ items }: { items: { label: string; href: string }[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-x-4 gap-y-2 border-b border-foreground/10 px-4 py-2 text-sm">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              isActive
                ? "font-medium text-foreground underline"
                : "text-foreground/60 hover:text-foreground"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
