import type { ReactNode } from "react";

import { requireRole } from "@/lib/auth/guards";
import { USER_ROLES } from "@/lib/constants/roles";
import { getViewer } from "@/lib/auth/session";

export default async function ClientLayout({ children }: { children: ReactNode }) {
  const viewer = await getViewer();
  requireRole(viewer, [USER_ROLES.CLIENT]);

  return <div className="flex flex-1 flex-col">{children}</div>;
}
