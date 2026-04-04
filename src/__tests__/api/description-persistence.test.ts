import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockSession, mockPrisma } = vi.hoisted(() => {
  const mockSession = { value: null as Record<string, unknown> | null };
  const mockPrisma = {
    project: { findUnique: vi.fn(), update: vi.fn() },
    projectVersion: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), findMany: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
    versionSignoff: { create: vi.fn(), findMany: vi.fn() },
    milestone: { updateMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn(), findMany: vi.fn() },
    projectPhase: { update: vi.fn() },
    notification: { create: vi.fn() },
    $transaction: vi.fn((fn: any) => fn(mockPrisma)),
  };
  return { mockSession, mockPrisma };
});
vi.mock("next-auth", () => ({ getServerSession: vi.fn(() => mockSession.value) }));
vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }));

import { POST as createVersion } from "@/app/api/projects/[id]/versions/route";

const projectId = "proj1";
const consultantId = "c1";

function makeVersionRequest(body: Record<string, unknown>) {
  return new NextRequest(`http://localhost:3000/api/projects/${projectId}/versions`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const params = Promise.resolve({ id: projectId });

describe("Description Persistence Across Phases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.projectVersion.create.mockResolvedValue({ id: "v2", versionNumber: 2 });
    mockPrisma.projectVersion.findFirst.mockResolvedValue(null);
  });

  it("includes description in metaSnapshot when creating a new version", async () => {
    const descriptionJson = { type: "doc", content: [] };
    const descriptionText = "Updated project description";

    mockSession.value = { user: { id: consultantId, role: "CONSULTANT" } };
    mockPrisma.project.findUnique.mockResolvedValue({
      id: projectId,
      creatorId: consultantId,
      status: "IN_PROGRESS",
      currentPhase: 1,
      versions: [{ versionNumber: 1, isActive: true }],
      milestones: [],
      phases: [],
    });

    const body = {
      title: "Updated Title",
      deadline: "2025-12-01",
      technologies: ["React"],
      phases: [],
      descriptionJson,
      descriptionText,
    };

    await createVersion(makeVersionRequest(body), { params });

    // Verify that metaSnapshot includes description fields
    expect(mockPrisma.projectVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metaSnapshot: expect.objectContaining({
            title: "Updated Title",
            deadline: "2025-12-01",
            technologies: ["React"],
            descriptionJson,
            descriptionText,
          }),
        }),
      })
    );
  });

});
