import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockSession, mockTx, mockPrisma } = vi.hoisted(() => {
  const mockSession = { value: null as Record<string, unknown> | null };
  const mockTx = {
    projectVersion: { update: vi.fn() },
    notification: { create: vi.fn() },
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

import { POST } from "@/app/api/projects/[id]/defer/route";

const projectId = "proj1";
const consultantId = "c1";
const learnerId = "l1";
const versionId = "v2";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest(`http://localhost:3000/api/projects/${projectId}/defer`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const params = Promise.resolve({ id: projectId });

describe("POST /api/projects/[id]/defer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.value = { user: { id: consultantId, role: "CONSULTANT" } };

    mockPrisma.project.findUnique.mockResolvedValue({
      id: projectId,
      creatorId: consultantId,
      status: "IN_PROGRESS",
      currentPhase: 1,
      assignees: [{ learnerId }],
      phases: [
        { id: "ph1", phaseNumber: 1 },
        { id: "ph2", phaseNumber: 2 },
      ],
    });

    mockPrisma.projectVersion.findUnique.mockResolvedValue({
      id: versionId,
      projectId,
      versionNumber: 2,
      status: "PENDING",
    });
  });

  it("defers version to next phase", async () => {
    const res = await POST(makeRequest({ versionId }), { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.deferredToPhase).toBe(2);
  });

  it("marks version as DEFERRED with next phase number", async () => {
    await POST(makeRequest({ versionId }), { params });

    expect(mockTx.projectVersion.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "DEFERRED", phaseNumber: 2 },
      })
    );
  });

  it("creates notification for other party", async () => {
    await POST(makeRequest({ versionId }), { params });

    expect(mockTx.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: learnerId,
          type: "VERSION_DEFERRED",
        }),
      })
    );
  });

  it("rejects non-IN_PROGRESS project", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      id: projectId,
      creatorId: consultantId,
      status: "OPEN",
      assignees: [],
      phases: [],
    });

    const res = await POST(makeRequest({ versionId }), { params });
    expect(res.status).toBe(400);
  });

  it("rejects when no next phase exists", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      id: projectId,
      creatorId: consultantId,
      status: "IN_PROGRESS",
      currentPhase: 2,
      assignees: [{ learnerId }],
      phases: [
        { id: "ph1", phaseNumber: 1 },
        { id: "ph2", phaseNumber: 2 },
      ],
    });

    const res = await POST(makeRequest({ versionId }), { params });
    expect(res.status).toBe(400);
  });

  it("rejects unrelated user", async () => {
    mockSession.value = { user: { id: "random", role: "LEARNER" } };
    const res = await POST(makeRequest({ versionId }), { params });
    expect(res.status).toBe(403);
  });
});
