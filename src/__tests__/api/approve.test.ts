import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockSession, mockTx, mockPrisma } = vi.hoisted(() => {
  const mockSession = { value: null as Record<string, unknown> | null };
  const mockTx = {
    projectVersion: { updateMany: vi.fn(), update: vi.fn() },
    project: { update: vi.fn() },
    versionSignoff: { upsert: vi.fn() },
  };
  const mockPrisma = {
    project: { findUnique: vi.fn() },
    projectVersion: { findUnique: vi.fn() },
    $transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<void>) => fn(mockTx)),
  };
  return { mockSession, mockTx, mockPrisma };
});
vi.mock("next-auth", () => ({ getServerSession: vi.fn(() => mockSession.value) }));
vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }));

import { POST } from "@/app/api/projects/[id]/approve/route";

const projectId = "proj1";
const consultantId = "c1";
const versionId = "v2";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest(`http://localhost:3000/api/projects/${projectId}/approve`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const params = Promise.resolve({ id: projectId });

describe("POST /api/projects/[id]/approve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.value = { user: { id: consultantId, roles: ["CONSULTANT"] } };

    mockPrisma.project.findUnique.mockResolvedValue({
      id: projectId,
      creatorId: consultantId,
      status: "OPEN",
      currentPhase: 1,
    });

    mockPrisma.projectVersion.findUnique.mockResolvedValue({
      id: versionId,
      projectId,
      status: "PENDING",
      metaSnapshot: {
        title: "Updated Title",
        deadline: "2025-12-01",
        technologies: ["React"],
      },
    });
  });

  it("approves version for OPEN project", async () => {
    const res = await POST(makeRequest({ versionId }), { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  it("activates version and marks as SELF_APPROVED", async () => {
    await POST(makeRequest({ versionId }), { params });

    expect(mockTx.projectVersion.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: versionId },
        data: { isActive: true, status: "SELF_APPROVED" },
      })
    );
  });

  it("deactivates all previous versions", async () => {
    await POST(makeRequest({ versionId }), { params });

    expect(mockTx.projectVersion.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId },
        data: { isActive: false },
      })
    );
  });

  it("commits metaSnapshot to project", async () => {
    await POST(makeRequest({ versionId }), { params });

    expect(mockTx.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Updated Title",
          technologies: ["React"],
        }),
      })
    );
  });

  it("records signoff", async () => {
    await POST(makeRequest({ versionId }), { params });
    expect(mockTx.versionSignoff.upsert).toHaveBeenCalled();
  });

  it("rejects for IN_PROGRESS project", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      id: projectId,
      creatorId: consultantId,
      status: "IN_PROGRESS",
    });
    const res = await POST(makeRequest({ versionId }), { params });
    expect(res.status).toBe(400);
  });

  it("rejects non-PENDING version", async () => {
    mockPrisma.projectVersion.findUnique.mockResolvedValue({
      id: versionId,
      projectId,
      status: "SELF_APPROVED",
    });
    const res = await POST(makeRequest({ versionId }), { params });
    expect(res.status).toBe(400);
  });

  it("rejects non-owner consultant", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      id: projectId,
      creatorId: "someone-else",
      status: "OPEN",
    });
    const res = await POST(makeRequest({ versionId }), { params });
    expect(res.status).toBe(403);
  });
});
