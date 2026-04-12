// src/app/api/courses/[id]/reviews/[reviewId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const patchSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  body: z.string().trim().max(2000).optional(),
});

// PATCH /api/courses/[id]/reviews/[reviewId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; reviewId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reviewId } = await params;

  const review = await prisma.courseReview.findUnique({ where: { id: reviewId } });
  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (review.learnerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await prisma.courseReview.update({
    where: { id: reviewId },
    data: {
      ...(parsed.data.rating !== undefined && { rating: parsed.data.rating }),
      ...(parsed.data.body !== undefined && { body: parsed.data.body }),
    },
    include: { learner: { select: { id: true, name: true, avatar: true } } },
  });

  return NextResponse.json(updated);
}

// DELETE /api/courses/[id]/reviews/[reviewId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; reviewId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reviewId } = await params;

  const review = await prisma.courseReview.findUnique({ where: { id: reviewId } });
  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Learner can delete own review; admin can delete any
  const isAdmin = session.user.roles?.includes("ADMIN");
  if (review.learnerId !== session.user.id && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.courseReview.delete({ where: { id: reviewId } });
  return NextResponse.json({ success: true });
}
