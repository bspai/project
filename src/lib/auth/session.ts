// src/lib/auth/session.ts
import { getServerSession, Session } from "next-auth";
import { authOptions } from "./auth-options";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireRole(role: Role) {
  const session = await requireAuth();
  if (!session.user.roles.includes(role)) {
    redirect("/unauthorized");
  }
  return session;
}

export async function requireAnyRole(roles: Role[]) {
  const session = await requireAuth();
  if (!roles.some((r) => session.user.roles.includes(r))) {
    redirect("/unauthorized");
  }
  return session;
}

/** Non-redirecting helper — use in API routes or conditional logic */
export function hasRole(session: Session, role: Role): boolean {
  return session.user.roles.includes(role);
}
