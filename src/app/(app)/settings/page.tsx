// src/app/(app)/settings/page.tsx
import { requireAuth } from "@/lib/auth/session";
import { Metadata } from "next";
import { Settings, KeyRound } from "lucide-react";
import { Card } from "@/modules/shared/components/Card";
import { PasswordForm } from "./PasswordForm";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAuth();

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-8">
        <Settings className="w-5 h-5 text-surface-400" />
        <h1 className="text-2xl font-bold text-surface-900">Settings</h1>
      </div>

      <Card padding="md">
        <div className="flex items-center gap-2 mb-5">
          <KeyRound className="w-4 h-4 text-surface-400" />
          <h2 className="font-semibold text-surface-900">Change Password</h2>
        </div>
        <PasswordForm />
      </Card>
    </div>
  );
}
