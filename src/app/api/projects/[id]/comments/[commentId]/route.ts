// src/app/api/projects/[id]/comments/[commentId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

type Params = { params: Promise<{ id: string; commentId: string }> };

// PATCH /api/projects/[id]/comments/[commentId] — edit own comment body
export async function PATCH(req: NextRequest, { params }: Params) {
  const { commentId } = await params;

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, authorId: true },
  });

  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  if (comment.authorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = z.object({ body: z.string().min(1).max(5000) }).safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: { body: parsed.data.body, isEdited: true },
    include: {
      author: { select: { id: true, name: true, avatar: true, role: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, avatar: true, role: true } } },
      },
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/projects/[id]/comments/[commentId] — delete own comment
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { commentId } = await params;

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, authorId: true },
  });

  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  if (comment.authorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.comment.delete({ where: { id: commentId } });

  return new NextResponse(null, { status: 204 });
}
