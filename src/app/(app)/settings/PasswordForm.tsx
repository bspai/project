// src/app/(app)/settings/PasswordForm.tsx
"use client";

import { useState } from "react";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Button } from "@/modules/shared/components/Button";

function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  error?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-surface-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className={`w-full h-10 px-3 pr-10 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 ${
            error ? "border-danger" : "border-surface-200"
          }`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
          tabIndex={-1}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");

  function validate() {
    const e: Record<string, string> = {};
    if (!current) e.current = "Required";
    if (!next) e.next = "Required";
    else if (next.length < 8) e.next = "Must be at least 8 characters";
    if (!confirm) e.confirm = "Required";
    else if (next && confirm && next !== confirm) e.confirm = "Passwords do not match";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(false);
    setGlobalError("");
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);

    const res = await fetch("/api/user/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: current,
        newPassword: next,
        confirmPassword: confirm,
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      // Map server field errors back to form fields
      if (data.details?.fieldErrors) {
        const fe = data.details.fieldErrors as Record<string, string[]>;
        const mapped: Record<string, string> = {};
        if (fe.currentPassword) mapped.current = fe.currentPassword[0];
        if (fe.newPassword) mapped.next = fe.newPassword[0];
        if (fe.confirmPassword) mapped.confirm = fe.confirmPassword[0];
        if (Object.keys(mapped).length) { setErrors(mapped); return; }
      }
      setGlobalError(data.error ?? "Something went wrong.");
      return;
    }

    setSuccess(true);
    setCurrent("");
    setNext("");
    setConfirm("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
      <PasswordInput
        id="current-password"
        label="Current password"
        value={current}
        onChange={(v) => { setCurrent(v); setErrors((p) => ({ ...p, current: "" })); setSuccess(false); }}
        autoComplete="current-password"
        error={errors.current}
      />
      <PasswordInput
        id="new-password"
        label="New password"
        value={next}
        onChange={(v) => { setNext(v); setErrors((p) => ({ ...p, next: "" })); setSuccess(false); }}
        autoComplete="new-password"
        error={errors.next}
      />
      <PasswordInput
        id="confirm-password"
        label="Confirm new password"
        value={confirm}
        onChange={(v) => { setConfirm(v); setErrors((p) => ({ ...p, confirm: "" })); setSuccess(false); }}
        autoComplete="new-password"
        error={errors.confirm}
      />

      {globalError && (
        <p className="text-sm text-danger">{globalError}</p>
      )}

      {success && (
        <div className="flex items-center gap-2 text-sm text-success">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Password updated successfully.
        </div>
      )}

      <Button type="submit" isLoading={saving} disabled={!current || !next || !confirm}>
        Update Password
      </Button>
    </form>
  );
}
