// src/app/(auth)/accept-invite/[token]/page.tsx
import { prisma } from "@/lib/db/prisma";
import { BookOpen, AlertCircle } from "lucide-react";
import { AcceptInviteForm } from "./AcceptInviteForm";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function AcceptInvitePage({ params }: Props) {
  const { token } = await params;

  // Validate token server-side
  const user = await prisma.user.findUnique({
    where: { inviteToken: token },
    select: { email: true, name: true, role: true, inviteTokenExpiry: true, password: true },
  });

  const isInvalid  = !user;
  const isAccepted = !!user?.password;
  const isExpired  = user?.inviteTokenExpiry ? user.inviteTokenExpiry < new Date() : false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-brand-900 to-surface-900 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500 shadow-lift mb-4">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">KaliYUVA LMS</h1>
          <p className="text-brand-300 text-sm mt-1">Project-based learning platform</p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-2xl">
          {isInvalid || isExpired || isAccepted ? (
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-danger/20 mb-2">
                <AlertCircle className="w-6 h-6 text-red-300" />
              </div>
              <h2 className="text-lg font-semibold text-white">
                {isAccepted ? "Invite already used" : isExpired ? "Invite expired" : "Invalid invite link"}
              </h2>
              <p className="text-sm text-brand-300">
                {isAccepted
                  ? "This invite has already been accepted. Please sign in."
                  : isExpired
                  ? "This invite link has expired. Please ask your admin to send a new one."
                  : "This invite link is invalid or has been revoked."}
              </p>
              <a
                href="/login"
                className="inline-block mt-4 text-sm text-brand-300 hover:text-white underline transition-colors"
              >
                Go to sign in →
              </a>
            </div>
          ) : (
            <AcceptInviteForm
              token={token}
              email={user!.email}
              defaultName={user!.name}
              role={user!.role}
            />
          )}
        </div>
      </div>
    </div>
  );
}
