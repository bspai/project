// src/app/(app)/admin/users/InviteUserForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Copy, Check, X } from "lucide-react";
import { Button } from "@/modules/shared/components/Button";

export function InviteUserForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"CONSULTANT" | "LEARNER">("LEARNER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setEmail("");
    setName("");
    setRole("LEARNER");
    setError(null);
    setInviteUrl(null);
    setCopied(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send invite");
      setInviteUrl(data.inviteUrl);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Button
        leftIcon={<UserPlus className="w-4 h-4" />}
        onClick={() => { reset(); setOpen(true); }}
      >
        Invite User
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => { if (!loading) { setOpen(false); reset(); } }}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-surface-900">Invite User</h2>
              <button
                onClick={() => { setOpen(false); reset(); }}
                disabled={loading}
                className="text-surface-400 hover:text-surface-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteUrl ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-success-dark font-medium">
                  <Check className="w-4 h-4" />
                  Invite created successfully
                </div>
                <p className="text-sm text-surface-600">
                  Share this link with <span className="font-medium">{email}</span>. It expires in 7 days.
                </p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={inviteUrl}
                    className="flex-1 h-9 px-3 rounded-lg border border-surface-200 text-xs text-surface-700 bg-surface-50 focus:outline-none"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    onClick={handleCopy}
                  >
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { reset(); }}
                  >
                    Invite Another
                  </Button>
                  <Button size="sm" onClick={() => { setOpen(false); reset(); }}>
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-surface-700">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Smith"
                    required
                    disabled={loading}
                    className="w-full h-9 px-3 rounded-lg border border-surface-200 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-surface-700">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                    required
                    disabled={loading}
                    className="w-full h-9 px-3 rounded-lg border border-surface-200 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-surface-700">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as "CONSULTANT" | "LEARNER")}
                    disabled={loading}
                    className="w-full h-9 px-3 rounded-lg border border-surface-200 text-sm text-surface-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="LEARNER">Learner</option>
                    <option value="CONSULTANT">Consultant</option>
                  </select>
                </div>
                {error && <p className="text-xs text-danger">{error}</p>}
                <div className="flex gap-3 justify-end pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => { setOpen(false); reset(); }}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    isLoading={loading}
                    disabled={!email || !name}
                  >
                    Create Invite
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
