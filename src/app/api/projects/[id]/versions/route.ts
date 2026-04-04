// src/app/api/projects/[id]/versions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { InputJsonValue } from "@prisma/client/runtime/library";


const schema = z.object({
  title: z.string().min(3),
  deadline: z.string().min(1),
  technologies: z.array(z.string()).min(1),
  descriptionJson: z.record(z.unknown()),
  descriptionText: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CONSULTANT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      versions: { orderBy: { versionNumber: "desc" }, take: 1 },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (project.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existingPending = await prisma.projectVersion.findFirst({
    where: { projectId, status: "PENDING" },
  });
  if (existingPending) {
    return NextResponse.json(
      { error: "There is already a pending version awaiting approval. Approve or discard it first." },
      { status: 409 }
    );
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { title, deadline, technologies, descriptionJson, descriptionText } = parsed.data;

  const latestVersion = project.versions[0];
  const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

  // IMPORTANT: Only create the pending version record — do NOT mutate project
  // metadata or milestones here. The active version stays active so the detail
  // page can diff old vs new. All changes are committed by /approve on approval.
  // This also prevents milestones from doubling on each edit submission.
  await prisma.projectVersion.create({
    data: {
      versionNumber: nextVersionNumber,
      projectId,
      submittedById: session.user.id,
      isActive: false,
      status: "PENDING",
      phaseNumber: project.currentPhase,
      descriptionJson: descriptionJson as InputJsonValue,
      descriptionText,
      metaSnapshot: {
        title,
        deadline,
        technologies,
        descriptionJson,
        descriptionText,
      },
    },
  });

  return NextResponse.json({ id: projectId, versionNumber: nextVersionNumber });
}
