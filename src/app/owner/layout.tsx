import type { ReactNode } from "react";

import { RoleHeader } from "@/components/layout/role-header";
import { requireRole } from "@/lib/auth/guards";
import { USER_ROLES } from "@/lib/constants/roles";
import { getViewer } from "@/lib/auth/session";
import { getOwnNotifications } from "@/lib/notifications/get-notifications";

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
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
