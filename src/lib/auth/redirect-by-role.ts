import { USER_ROLES, type UserRole } from "@/lib/constants/roles";

export function dashboardPathForRole(role: UserRole): string {
  switch (role) {
    case USER_ROLES.SUPER_ADMIN:
      return "/admin/dashboard";
    case USER_ROLES.OWNER:
      return "/owner/dashboard";
    case USER_ROLES.CLIENT:
      return "/client/dashboard";
  }
}
