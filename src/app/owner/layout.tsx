import type { ReactNode } from "react";

import { RoleHeader } from "@/components/layout/role-header";
import { RoleNav } from "@/components/layout/role-nav";
import { requireRole } from "@/lib/auth/guards";
import { USER_ROLES } from "@/lib/constants/roles";
import { getViewer } from "@/lib/auth/session";
import { getOwnNotifications } from "@/lib/notifications/get-notifications";

const NAV_ITEMS = [
  { label: "Tableau de bord", href: "/owner/dashboard" },
  { label: "Résidences", href: "/owner/properties" },
  { label: "Calendrier", href: "/owner/calendar" },
  { label: "Réservations", href: "/owner/bookings" },
  { label: "Finances", href: "/owner/finance" },
  { label: "Paramètres", href: "/owner/settings" },
];

export default async function OwnerLayout({ children }: { children: ReactNode }) {
  const viewer = await getViewer();
  requireRole(viewer, [USER_ROLES.OWNER]);
  const { unreadCount } = await getOwnNotifications();

  return (
    <div className="flex flex-1 flex-col">
      <RoleHeader
        fullName={viewer.fullName}
        roleLabel="Propriétaire / gérant"
        notificationsHref="/owner/notifications"
        unreadCount={unreadCount}
      />
      <RoleNav items={NAV_ITEMS} />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
