/**
 * Role-based access control utilities — replaces the legacy
 * `email.includes("admin")` check with proper permissions.
 */

export type Role = "user" | "admin" | "moderator";

export type Permission =
  | "view:admin-panel"
  | "manage:users"
  | "manage:challenges"
  | "view:analytics"
  | "create:battle"
  | "moderate:content";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  user: ["create:battle"],
  moderator: ["create:battle", "manage:challenges", "moderate:content"],
  admin: [
    "view:admin-panel",
    "manage:users",
    "manage:challenges",
    "view:analytics",
    "create:battle",
    "moderate:content",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

const ADMIN_ALLOWLIST = ["admin@javify.dev", "support@javify.dev"];

/**
 * Resolve role from email + optional explicit role from backend.
 * Backend role always wins. Demo allowlist used only when offline.
 */
export function resolveRole(email: string, backendRole?: Role): Role {
  if (backendRole) return backendRole;
  const normalized = email.trim().toLowerCase();
  return ADMIN_ALLOWLIST.includes(normalized) ? "admin" : "user";
}

export function isAdmin(role: Role) {
  return role === "admin";
}

export function isModerator(role: Role) {
  return role === "moderator" || role === "admin";
}
