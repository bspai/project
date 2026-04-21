// src/app/api/courses/[id]/modules/reorder/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const schema = z.object({
  order: z.array(z.object({ id: z.string(), order: z.number().int().positive() })),
});

// PATCH /api/courses/[id]/modules/reorder
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.roles.includes("MENTOR")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: courseId } = await params;

  const course = await prisma.course.findFirst({
    where: { id: courseId, creatorId: session.user.id },
    select: { id: true },
  });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  // Use a transaction with a temporary offset to avoid transient unique constraint
  // violations on (courseId, order) while reassigning orders.
  const offset = 10000;
  await prisma.$transaction([
    // Step 1: shift all to a safe temporary range
    ...parsed.data.order.map(({ id, order }) =>
      prisma.courseModule.update({
        where: { id, courseId },
        data: { order: order + offset },
      })
    ),
    // Step 2: set final orders
    ...parsed.data.order.map(({ id, order }) =>
      prisma.courseModule.update({
        where: { id, courseId },
        data: { order },
      })
    ),
  ]);

  return NextResponse.json({ success: true });
}
