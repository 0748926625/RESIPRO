import type { ReactNode } from "react";

import { RoleHeader } from "@/components/layout/role-header";
import { RoleNav } from "@/components/layout/role-nav";
import { requireRole } from "@/lib/auth/guards";
import { USER_ROLES } from "@/lib/constants/roles";
import { getViewer } from "@/lib/auth/session";
import { getOwnNotifications } from "@/lib/notifications/get-notifications";

const NAV_ITEMS = [
  { label: "Mon espace", href: "/client/dashboard" },
  { label: "Mes réservations", href: "/client/bookings" },
  { label: "Partagées", href: "/client/shared-bookings" },
  { label: "Mes paiements", href: "/client/payments" },
  { label: "Demandes personnalisées", href: "/client/intermediation" },
  { label: "Mon profil", href: "/client/profile" },
];

export default async function ClientLayout({ children }: { children: ReactNode }) {
  const viewer = await getViewer();
  requireRole(viewer, [USER_ROLES.CLIENT]);
  const { unreadCount } = await getOwnNotifications();

  return (
    <div className="flex flex-1 flex-col">
      <RoleHeader
        fullName={viewer.fullName}
        roleLabel="Client"
        notificationsHref="/client/notifications"
        unreadCount={unreadCount}
        navItems={NAV_ITEMS}
      />
      <RoleNav items={NAV_ITEMS} />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
