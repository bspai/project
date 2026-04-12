// src/app/api/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { InputJsonValue } from "@prisma/client/runtime/library";

const phaseSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
});

const milestoneSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  deadline: z.string().min(1),
  phaseNumber: z.number().default(1),
});

const createSchema = z.object({
  title: z.string().min(3),
  deadline: z.string().min(1),
  technologies: z.array(z.string()).min(1),
  phases: z.array(phaseSchema).default([]),
  milestones: z.array(milestoneSchema),
  descriptionJson: z.custom<InputJsonValue>((val) => val !== null),
  descriptionText: z.string().min(1),
});

// POST /api/projects — create a new project
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.roles.includes("CONSULTANT")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { title, deadline, technologies, phases, milestones, descriptionJson, descriptionText } =
    parsed.data;

  // Build phase records — default to a single phase if none provided
  const phaseRecords = phases.length > 0
    ? phases.map((p, i) => ({
        phaseNumber: i + 1,
        title: p.title,
        status: i === 0 ? ("ACTIVE" as const) : ("UPCOMING" as const),
        ...(i === 0 ? { startedAt: new Date() } : {}),
      }))
    : [{ phaseNumber: 1, title: "Phase 1", status: "ACTIVE" as const, startedAt: new Date() }];

  const project = await prisma.project.create({
    data: {
      title,
      deadline: new Date(deadline),
      technologies,
      status: "OPEN",
      currentPhase: 1,
      creatorId: session.user.id,
      phases: {
        create: phaseRecords,
      },
      milestones: {
        create: milestones.map((m, i) => ({
          title: m.title,
          deadline: new Date(m.deadline),
          order: i + 1,
          phaseNumber: m.phaseNumber,
        })),
      },
    },
  });

  // Create version 1 with metaSnapshot
  await prisma.projectVersion.create({
    data: {
      versionNumber: 1,
      projectId: project.id,
      submittedById: session.user.id,
      isActive: true,
      status: "SELF_APPROVED",
      phaseNumber: 1,
      descriptionJson: descriptionJson as InputJsonValue,
      descriptionText,
      metaSnapshot: {
        title,
        deadline,
        technologies,
        milestones: milestones.map((m) => ({ title: m.title, deadline: m.deadline })),
      },
    },
  });

  return NextResponse.json({ id: project.id }, { status: 201 });
}

// GET /api/projects — list projects
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const where =
    session.user.roles.includes("CONSULTANT")
      ? {
          creatorId: session.user.id,
          ...(status ? { status: status as never } : {}),
          ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
        }
      : {
          status: (status as never) ?? "OPEN",
          ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
        };

  const projects = await prisma.project.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      creator: { select: { id: true, name: true } },
      versions: {
        where: { isActive: true },
        select: { versionNumber: true },
        take: 1,
      },
      _count: {
        select: { workRequests: true, comments: true, milestones: true },
      },
    },
  });

  return NextResponse.json(projects);
}
