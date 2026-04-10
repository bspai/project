// src/app/(app)/admin/users/page.tsx
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Metadata } from "next";
import { Users, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardTitle } from "@/modules/shared/components/Card";
import { Badge } from "@/modules/shared/components/Badge";
import { formatDate, formatRelative } from "@/modules/shared/utils";
import { InviteUserForm } from "./InviteUserForm";

export const metadata: Metadata = { title: "User Management" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireRole("ADMIN");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      password: true,
      inviteTokenExpiry: true,
    },
  });

  const total    = users.length;
  const active   = users.filter((u) => !!u.password).length;
  const pending  = users.filter((u) => !u.password).length;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-surface-400" />
          <h1 className="text-2xl font-bold text-surface-900">User Management</h1>
        </div>
        <InviteUserForm />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total Users",    value: total,   icon: <Users className="w-5 h-5" />,        color: "text-brand-600", bg: "bg-brand-50" },
          { label: "Active",         value: active,  icon: <CheckCircle2 className="w-5 h-5" />, color: "text-success",   bg: "bg-success/10" },
          { label: "Invite Pending", value: pending, icon: <Clock className="w-5 h-5" />,        color: "text-warning",   bg: "bg-warning/10" },
        ].map((s) => (
          <Card key={s.label} padding="md">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.bg} ${s.color}`}>
                {s.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-surface-900">{s.value}</p>
                <p className="text-sm text-surface-500">{s.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Users table */}
      <Card padding="none">
        <div className="px-6 py-4 border-b border-surface-100">
          <CardTitle>All Users</CardTitle>
        </div>

        {users.length === 0 ? (
          <div className="py-16 text-center text-sm text-surface-400 italic">
            No users yet. Use the Invite User button to get started.
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {users.map((user) => {
              const isActive  = !!user.password;
              const isExpired = !isActive && user.inviteTokenExpiry && user.inviteTokenExpiry < new Date();

              return (
                <div key={user.id} className="flex items-center gap-4 px-6 py-4">
                  {/* Avatar placeholder */}
                  <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-900">{user.name}</p>
                    <p className="text-xs text-surface-500">{user.email}</p>
                  </div>

                  <Badge variant={user.role === "CONSULTANT" ? "info" : user.role === "ADMIN" ? "warning" : "success"}>
                    {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
                  </Badge>

                  {isActive ? (
                    <Badge variant="success" dot>Active</Badge>
                  ) : isExpired ? (
                    <div className="flex items-center gap-1 text-xs text-danger">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Invite expired
                    </div>
                  ) : (
                    <Badge variant="warning" dot>Invite pending</Badge>
                  )}

                  <span className="text-xs text-surface-400 shrink-0">
                    {isActive ? `Joined ${formatDate(user.createdAt)}` : `Invited ${formatRelative(user.createdAt)}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
