// src/app/api/admin/accept-invite/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

// GET /api/admin/accept-invite?token=xxx — validate token, return user info
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { inviteToken: token },
    select: { id: true, name: true, email: true, role: true, inviteTokenExpiry: true, password: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  }

  if (user.password) {
    return NextResponse.json({ error: "This invite has already been accepted" }, { status: 409 });
  }

  if (user.inviteTokenExpiry && user.inviteTokenExpiry < new Date()) {
    return NextResponse.json({ error: "This invite link has expired. Please ask your admin for a new one." }, { status: 410 });
  }

  return NextResponse.json({
    email: user.email,
    name: user.name,
    role: user.role,
  });
}

const acceptSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1).max(100),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// POST /api/admin/accept-invite — set name + password, clear token
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = acceptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { token, name, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { inviteToken: token },
    select: { id: true, inviteTokenExpiry: true, password: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  }

  if (user.password) {
    return NextResponse.json({ error: "This invite has already been accepted" }, { status: 409 });
  }

  if (user.inviteTokenExpiry && user.inviteTokenExpiry < new Date()) {
    return NextResponse.json({ error: "This invite link has expired" }, { status: 410 });
  }

  const hashed = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      password: hashed,
      inviteToken: null,
      inviteTokenExpiry: null,
    },
  });

  return NextResponse.json({ ok: true });
}
