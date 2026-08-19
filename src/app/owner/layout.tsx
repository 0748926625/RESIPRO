import type { ReactNode } from "react";

import { requireRole } from "@/lib/auth/guards";
import { USER_ROLES } from "@/lib/constants/roles";
import { getViewer } from "@/lib/auth/session";

export default async function OwnerLayout({ children }: { children: ReactNode }) {
  const viewer = await getViewer();
  requireRole(viewer, [USER_ROLES.OWNER]);

  return <div className="flex flex-1 flex-col">{children}</div>;
}
