import type { Viewer } from "./session";

export function isAdmin(viewer: Viewer): boolean {
  return viewer.role === "super_admin";
}

export function isOwner(viewer: Viewer): boolean {
  return viewer.role === "owner";
}

export function isClient(viewer: Viewer): boolean {
  return viewer.role === "client";
}

export function isAuthenticated(
  viewer: Viewer,
): viewer is Extract<Viewer, { profileId: string }> {
  return viewer.role !== "visitor";
}
