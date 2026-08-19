import type { ReactNode } from "react";

import { RoleHeader } from "@/components/layout/role-header";
import { RoleNav } from "@/components/layout/role-nav";
import { requireRole } from "@/lib/auth/guards";
import { USER_ROLES } from "@/lib/constants/roles";
import { getViewer } from "@/lib/auth/session";
import { getOwnNotifications } from "@/lib/notifications/get-notifications";

const NAV_ITEMS = [
  { label: "Tableau de bord", href: "/admin/dashboard" },
  { label: "Résidences", href: "/admin/properties" },
  { label: "Propriétaires", href: "/admin/owners" },
  { label: "Réservations", href: "/admin/bookings" },
  { label: "Partagées", href: "/admin/shared-bookings" },
  { label: "Paiements", href: "/admin/payments" },
  { label: "Intermédiation", href: "/admin/intermediation" },
  { label: "Utilisateurs", href: "/admin/users" },
  { label: "Journal d'audit", href: "/admin/audit-logs" },
  { label: "Paramètres", href: "/admin/settings" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const viewer = await getViewer();
  requireRole(viewer, [USER_ROLES.SUPER_ADMIN]);
  const { unreadCount } = await getOwnNotifications();

  return (
    <div className="flex flex-1 flex-col">
      <RoleHeader
        fullName={viewer.fullName}
        roleLabel="Super Admin"
        notificationsHref="/admin/notifications"
        unreadCount={unreadCount}
      />
      <RoleNav items={NAV_ITEMS} />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
