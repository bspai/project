// src/app/unauthorized/page.tsx
import Link from "next/link";
import { ShieldOff } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-danger/10 text-danger mb-4">
          <ShieldOff className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-surface-900 mb-2">Access Denied</h1>
        <p className="text-surface-500 text-sm mb-6">
          You don&apos;t have permission to view this page.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center h-10 px-6 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
