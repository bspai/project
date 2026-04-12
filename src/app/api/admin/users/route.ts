// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import crypto from "crypto";

// GET /api/admin/users — list all users
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.roles.includes("ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      roles: true,
      createdAt: true,
      inviteToken: true,
      inviteTokenExpiry: true,
      password: true, // used only to determine pending status
    },
  });

  // Map to safe response — never expose password or raw token
  const result = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    roles: u.roles,
    createdAt: u.createdAt,
    status: u.password ? "active" : "pending",
    inviteExpired:
      u.inviteTokenExpiry ? u.inviteTokenExpiry < new Date() : false,
  }));

  return NextResponse.json(result);
}

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  roles: z.array(z.enum(["CONSULTANT", "LEARNER", "MENTOR"])).min(1),
});

// POST /api/admin/users — invite a new user
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.roles.includes("ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email, name, roles } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 }
    );
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.user.create({
    data: {
      email,
      name,
      roles,
      inviteToken: token,
      inviteTokenExpiry: expiry,
      // password intentionally null — set on invite acceptance
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const inviteUrl = `${baseUrl}/accept-invite/${token}`;

  // Email skipped for now — log to console and return the link
  console.log(`[INVITE] ${email} (${roles.join(", ")}) → ${inviteUrl}`);

  return NextResponse.json({ inviteUrl }, { status: 201 });
}
