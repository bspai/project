// src/app/(app)/layout.tsx
import { requireAuth } from "@/lib/auth/session";
import { AppShell } from "@/modules/shared/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();
  return <AppShell user={session.user}>{children}</AppShell>;
}
