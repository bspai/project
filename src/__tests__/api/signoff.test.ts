import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockSession, mockTx, mockPrisma } = vi.hoisted(() => {
  const mockSession = { value: null as Record<string, unknown> | null };
  const mockTx = {
    projectVersion: { updateMany: vi.fn(), update: vi.fn() },
    project: { update: vi.fn() },
    milestone: { deleteMany: vi.fn(), createMany: vi.fn() },
    projectPhase: { update: vi.fn() },
    notification: { create: vi.fn() },
  };
  const mockPrisma = {
    project: { findUnique: vi.fn() },
    projectVersion: { findUnique: vi.fn() },
    versionSignoff: { create: vi.fn(), findMany: vi.fn() },
    notification: { create: vi.fn() },
    $transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<void>) => fn(mockTx)),
  };
  return { mockSession, mockTx, mockPrisma };
});
vi.mock("next-auth", () => ({ getServerSession: vi.fn(() => mockSession.value) }));
vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }));

import { POST } from "@/app/api/projects/[id]/signoff/route";

const projectId = "proj1";
const consultantId = "c1";
const learnerId = "l1";
const versionId = "v2";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest(`http://localhost:3000/api/projects/${projectId}/signoff`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const params = Promise.resolve({ id: projectId });

const projectBase = {
  id: projectId,
  creatorId: consultantId,
  status: "IN_PROGRESS",
  currentPhase: 1,
  assignees: [{ learnerId }],
  phases: [
    { id: "ph1", phaseNumber: 1, status: "ACTIVE" },
    { id: "ph2", phaseNumber: 2, status: "UPCOMING" },
  ],
};

const versionBase = {
  id: versionId,
  projectId,
  versionNumber: 2,
  status: "PENDING",
  signoffs: [],
  metaSnapshot: {
    title: "Updated",
    deadline: "2025-12-01",
    technologies: ["React"],
    milestones: [{ title: "M1", deadline: "2025-10-01", phaseNumber: 1 }],
  },
};

describe("POST /api/projects/[id]/signoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.project.findUnique.mockResolvedValue(projectBase);
    mockPrisma.projectVersion.findUnique.mockResolvedValue(versionBase);
    mockPrisma.versionSignoff.create.mockResolvedValue({ id: "s1" });
  });

  it("allows consultant partial signoff", async () => {
    mockSession.value = { user: { id: consultantId, role: "CONSULTANT" } };
    mockPrisma.versionSignoff.findMany.mockResolvedValue([
      { role: "CONSULTANT", userId: consultantId },
    ]);

    const res = await POST(makeRequest({ versionId }), { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.bothSigned).toBe(false);
    expect(data.status).toBe("partial");
  });

  it("allows learner partial signoff", async () => {
    mockSession.value = { user: { id: learnerId, role: "LEARNER" } };
    mockPrisma.versionSignoff.findMany.mockResolvedValue([
      { role: "LEARNER", userId: learnerId },
    ]);

    const res = await POST(makeRequest({ versionId }), { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.bothSigned).toBe(false);
  });

  it("approves when both sign off", async () => {
    mockSession.value = { user: { id: learnerId, role: "LEARNER" } };
    mockPrisma.versionSignoff.findMany.mockResolvedValue([
      { role: "CONSULTANT", userId: consultantId },
      { role: "LEARNER", userId: learnerId },
    ]);

    const res = await POST(makeRequest({ versionId }), { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.bothSigned).toBe(true);
    expect(data.status).toBe("approved");
  });

  it("activates version on mutual signoff", async () => {
    mockSession.value = { user: { id: learnerId, role: "LEARNER" } };
    mockPrisma.versionSignoff.findMany.mockResolvedValue([
      { role: "CONSULTANT", userId: consultantId },
      { role: "LEARNER", userId: learnerId },
    ]);

    await POST(makeRequest({ versionId }), { params });

    expect(mockTx.projectVersion.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { isActive: true, status: "APPROVED" },
      })
    );
  });

  it("advances phase on mutual signoff", async () => {
    mockSession.value = { user: { id: learnerId, role: "LEARNER" } };
    mockPrisma.versionSignoff.findMany.mockResolvedValue([
      { role: "CONSULTANT", userId: consultantId },
      { role: "LEARNER", userId: learnerId },
    ]);

    await POST(makeRequest({ versionId }), { params });

    // Current phase completed
    expect(mockTx.projectPhase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ph1" },
        data: expect.objectContaining({ status: "COMPLETE" }),
      })
    );
    // Next phase activated
    expect(mockTx.projectPhase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ph2" },
        data: expect.objectContaining({ status: "ACTIVE" }),
      })
    );
  });

  it("creates notifications on mutual signoff", async () => {
    mockSession.value = { user: { id: learnerId, role: "LEARNER" } };
    mockPrisma.versionSignoff.findMany.mockResolvedValue([
      { role: "CONSULTANT", userId: consultantId },
      { role: "LEARNER", userId: learnerId },
    ]);

    await POST(makeRequest({ versionId }), { params });

    expect(mockTx.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: consultantId,
          type: "VERSION_APPROVED",
        }),
      })
    );
  });

  it("notifies other party on partial signoff", async () => {
    mockSession.value = { user: { id: consultantId, role: "CONSULTANT" } };
    mockPrisma.versionSignoff.findMany.mockResolvedValue([
      { role: "CONSULTANT", userId: consultantId },
    ]);

    await POST(makeRequest({ versionId }), { params });

    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: learnerId,
          type: "VERSION_SUBMITTED",
        }),
      })
    );
  });

  it("rejects non-IN_PROGRESS project", async () => {
    mockSession.value = { user: { id: consultantId, role: "CONSULTANT" } };
    mockPrisma.project.findUnique.mockResolvedValue({ ...projectBase, status: "OPEN" });

    const res = await POST(makeRequest({ versionId }), { params });
    expect(res.status).toBe(400);
  });

  it("rejects duplicate signoff", async () => {
    mockSession.value = { user: { id: consultantId, role: "CONSULTANT" } };
    mockPrisma.projectVersion.findUnique.mockResolvedValue({
      ...versionBase,
      signoffs: [{ userId: consultantId, role: "CONSULTANT" }],
    });

    const res = await POST(makeRequest({ versionId }), { params });
    expect(res.status).toBe(409);
  });

  it("rejects unassigned learner", async () => {
    mockSession.value = { user: { id: "random-learner", role: "LEARNER" } };

    const res = await POST(makeRequest({ versionId }), { params });
    expect(res.status).toBe(403);
  });

  it("rejects non-PENDING version", async () => {
    mockSession.value = { user: { id: consultantId, role: "CONSULTANT" } };
    mockPrisma.projectVersion.findUnique.mockResolvedValue({
      ...versionBase,
      status: "APPROVED",
      signoffs: [],
    });

    const res = await POST(makeRequest({ versionId }), { params });
    expect(res.status).toBe(400);
  });
});
