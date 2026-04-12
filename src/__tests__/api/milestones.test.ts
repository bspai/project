import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockSession, mockTx, mockPrisma } = vi.hoisted(() => {
  const mockSession = { value: null as Record<string, unknown> | null };
  const mockTx = {
    projectPhase: { update: vi.fn() },
    project: { update: vi.fn() },
  };
  const mockPrisma = {
    project: { findUnique: vi.fn() },
    milestone: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<void>) => fn(mockTx)),
  };
  return { mockSession, mockTx, mockPrisma };
});
vi.mock("next-auth", () => ({ getServerSession: vi.fn(() => mockSession.value) }));
vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }));

import { PATCH, PUT, DELETE } from "@/app/api/projects/[id]/milestones/[milestoneId]/route";
import { POST } from "@/app/api/projects/[id]/milestones/route";

const projectId = "proj1";
const consultantId = "c1";
const learnerId = "l1";
const milestoneId = "m1";

const params = Promise.resolve({ id: projectId, milestoneId });
const projectParams = Promise.resolve({ id: projectId });

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

const milestoneBase = {
  id: milestoneId,
  projectId,
  isComplete: false,
  phaseNumber: 1,
  title: "Original Title",
  deadline: new Date("2025-10-01"),
};

// ─── PATCH (toggle) ──────────────────────────────────────────────────────────

describe("PATCH /api/projects/[id]/milestones/[milestoneId]", () => {
  function makeRequest() {
    return new NextRequest(
      `http://localhost:3000/api/projects/${projectId}/milestones/${milestoneId}`,
      { method: "PATCH" }
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.project.findUnique.mockResolvedValue(projectBase);
    mockPrisma.milestone.findUnique.mockResolvedValue(milestoneBase);
    mockPrisma.milestone.update.mockResolvedValue({ ...milestoneBase, isComplete: true });
    mockPrisma.milestone.findMany.mockResolvedValue([
      { id: milestoneId, isComplete: true, phaseNumber: 1 },
    ]);
  });

  it("allows consultant to toggle a milestone", async () => {
    mockSession.value = { user: { id: consultantId, roles: ["CONSULTANT"] } };
    const res = await PATCH(makeRequest(), { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.isComplete).toBe(true);
  });

  it("allows assigned learner to toggle a milestone", async () => {
    mockSession.value = { user: { id: learnerId, roles: ["LEARNER"] } };
    const res = await PATCH(makeRequest(), { params });
    expect(res.status).toBe(200);
  });

  it("advances phase when all phase milestones are complete", async () => {
    mockSession.value = { user: { id: consultantId, roles: ["CONSULTANT"] } };
    mockPrisma.milestone.findMany.mockResolvedValue([
      { id: milestoneId, isComplete: true, phaseNumber: 1 },
    ]);

    const res = await PATCH(makeRequest(), { params });
    const data = await res.json();
    expect(data.phaseAdvanced).toBe(true);

    expect(mockTx.projectPhase.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "ph1" }, data: expect.objectContaining({ status: "COMPLETE" }) })
    );
    expect(mockTx.projectPhase.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "ph2" }, data: expect.objectContaining({ status: "ACTIVE" }) })
    );
  });

  it("does not advance phase when milestones are incomplete", async () => {
    mockSession.value = { user: { id: consultantId, roles: ["CONSULTANT"] } };
    mockPrisma.milestone.update.mockResolvedValue({ ...milestoneBase, isComplete: false });
    mockPrisma.milestone.findMany.mockResolvedValue([
      { id: milestoneId, isComplete: false, phaseNumber: 1 },
      { id: "m2", isComplete: false, phaseNumber: 1 },
    ]);

    const res = await PATCH(makeRequest(), { params });
    const data = await res.json();
    expect(data.phaseAdvanced).toBe(false);
    expect(mockTx.projectPhase.update).not.toHaveBeenCalled();
  });

  it("reverts phase to ACTIVE when a milestone is unchecked in a COMPLETE phase", async () => {
    mockSession.value = { user: { id: consultantId, roles: ["CONSULTANT"] } };

    // Milestone is currently complete, toggling to incomplete
    mockPrisma.milestone.findUnique.mockResolvedValue({ ...milestoneBase, isComplete: true });
    mockPrisma.milestone.update.mockResolvedValue({ ...milestoneBase, isComplete: false });

    // Phase 1 is COMPLETE, phase 2 is ACTIVE (currentPhase = 2)
    mockPrisma.project.findUnique.mockResolvedValue({
      ...projectBase,
      currentPhase: 2,
      phases: [
        { id: "ph1", phaseNumber: 1, status: "COMPLETE" },
        { id: "ph2", phaseNumber: 2, status: "ACTIVE" },
      ],
    });

    mockPrisma.milestone.findMany.mockResolvedValue([
      { id: milestoneId, isComplete: false, phaseNumber: 1 },
    ]);

    const res = await PATCH(makeRequest(), { params });
    const data = await res.json();
    expect(data.phaseReverted).toBe(true);
    expect(data.phaseAdvanced).toBe(false);

    expect(mockTx.projectPhase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ph1" },
        data: expect.objectContaining({ status: "ACTIVE", completedAt: null }),
      })
    );
    expect(mockTx.projectPhase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ph2" },
        data: expect.objectContaining({ status: "UPCOMING", startedAt: null }),
      })
    );
    expect(mockTx.project.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ currentPhase: 1 }) })
    );
  });

  it("does not revert phase when milestone unchecked in an ACTIVE phase", async () => {
    mockSession.value = { user: { id: consultantId, roles: ["CONSULTANT"] } };

    mockPrisma.milestone.findUnique.mockResolvedValue({ ...milestoneBase, isComplete: true });
    mockPrisma.milestone.update.mockResolvedValue({ ...milestoneBase, isComplete: false });
    mockPrisma.milestone.findMany.mockResolvedValue([
      { id: milestoneId, isComplete: false, phaseNumber: 1 },
    ]);
    // Phase 1 is still ACTIVE (not COMPLETE), so no revert needed
    mockPrisma.project.findUnique.mockResolvedValue({
      ...projectBase,
      phases: [
        { id: "ph1", phaseNumber: 1, status: "ACTIVE" },
        { id: "ph2", phaseNumber: 2, status: "UPCOMING" },
      ],
    });

    const res = await PATCH(makeRequest(), { params });
    const data = await res.json();
    expect(data.phaseReverted).toBe(false);
    expect(mockTx.projectPhase.update).not.toHaveBeenCalled();
  });

  it("rejects unassigned learner", async () => {
    mockSession.value = { user: { id: "random-learner", roles: ["LEARNER"] } };
    const res = await PATCH(makeRequest(), { params });
    expect(res.status).toBe(403);
  });

  it("rejects non-IN_PROGRESS project", async () => {
    mockSession.value = { user: { id: consultantId, roles: ["CONSULTANT"] } };
    mockPrisma.project.findUnique.mockResolvedValue({ ...projectBase, status: "OPEN" });
    const res = await PATCH(makeRequest(), { params });
    expect(res.status).toBe(400);
  });

  it("rejects unauthenticated request", async () => {
    mockSession.value = null;
    const res = await PATCH(makeRequest(), { params });
    expect(res.status).toBe(401);
  });
});

// ─── PUT (update) ─────────────────────────────────────────────────────────────

describe("PUT /api/projects/[id]/milestones/[milestoneId]", () => {
  const validBody = { title: "New Title", deadline: "2025-11-01", phaseNumber: 1 };

  function makeRequest(body: Record<string, unknown> = validBody) {
    return new NextRequest(
      `http://localhost:3000/api/projects/${projectId}/milestones/${milestoneId}`,
      { method: "PUT", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.value = { user: { id: consultantId, roles: ["CONSULTANT"] } };
    mockPrisma.project.findUnique.mockResolvedValue({ ...projectBase, status: "OPEN" });
    mockPrisma.milestone.findUnique.mockResolvedValue(milestoneBase);
    mockPrisma.milestone.update.mockResolvedValue({ ...milestoneBase, title: "New Title" });
  });

  it("allows consultant to update a milestone", async () => {
    const res = await PUT(makeRequest(), { params });
    expect(res.status).toBe(200);
    expect(mockPrisma.milestone.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ title: "New Title" }) })
    );
  });

  it("rejects learner", async () => {
    mockSession.value = { user: { id: learnerId, roles: ["LEARNER"] } };
    const res = await PUT(makeRequest(), { params });
    expect(res.status).toBe(401);
  });

  it("rejects non-owner consultant", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({ ...projectBase, creatorId: "other" });
    const res = await PUT(makeRequest(), { params });
    expect(res.status).toBe(403);
  });

  it("rejects DONE project", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({ ...projectBase, status: "DONE" });
    const res = await PUT(makeRequest(), { params });
    expect(res.status).toBe(400);
  });

  it("rejects invalid body", async () => {
    const res = await PUT(makeRequest({ title: "" }), { params });
    expect(res.status).toBe(400);
  });

  it("rejects unauthenticated", async () => {
    mockSession.value = null;
    const res = await PUT(makeRequest(), { params });
    expect(res.status).toBe(401);
  });
});

// ─── DELETE ───────────────────────────────────────────────────────────────────

describe("DELETE /api/projects/[id]/milestones/[milestoneId]", () => {
  function makeRequest() {
    return new NextRequest(
      `http://localhost:3000/api/projects/${projectId}/milestones/${milestoneId}`,
      { method: "DELETE" }
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.value = { user: { id: consultantId, roles: ["CONSULTANT"] } };
    mockPrisma.project.findUnique.mockResolvedValue({ ...projectBase, status: "OPEN" });
    mockPrisma.milestone.findUnique.mockResolvedValue(milestoneBase);
    mockPrisma.milestone.delete.mockResolvedValue(milestoneBase);
  });

  it("allows consultant to delete a milestone", async () => {
    const res = await DELETE(makeRequest(), { params });
    expect(res.status).toBe(200);
    expect(mockPrisma.milestone.delete).toHaveBeenCalledWith({ where: { id: milestoneId } });
  });

  it("rejects learner", async () => {
    mockSession.value = { user: { id: learnerId, roles: ["LEARNER"] } };
    const res = await DELETE(makeRequest(), { params });
    expect(res.status).toBe(401);
  });

  it("rejects non-owner consultant", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({ ...projectBase, creatorId: "other" });
    const res = await DELETE(makeRequest(), { params });
    expect(res.status).toBe(403);
  });

  it("rejects ARCHIVED project", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({ ...projectBase, status: "ARCHIVED" });
    const res = await DELETE(makeRequest(), { params });
    expect(res.status).toBe(400);
  });

  it("rejects unauthenticated", async () => {
    mockSession.value = null;
    const res = await DELETE(makeRequest(), { params });
    expect(res.status).toBe(401);
  });
});

// ─── POST (create) ────────────────────────────────────────────────────────────

describe("POST /api/projects/[id]/milestones", () => {
  const validBody = { title: "New Milestone", deadline: "2025-11-01", phaseNumber: 1 };

  function makeRequest(body: Record<string, unknown> = validBody) {
    return new NextRequest(
      `http://localhost:3000/api/projects/${projectId}/milestones`,
      { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.value = { user: { id: consultantId, roles: ["CONSULTANT"] } };
    mockPrisma.project.findUnique.mockResolvedValue({ ...projectBase, status: "OPEN" });
    mockPrisma.milestone.findFirst.mockResolvedValue({ order: 2 });
    mockPrisma.milestone.create.mockResolvedValue({ id: "m-new", ...validBody, order: 3, projectId });
  });

  it("allows consultant to create a milestone", async () => {
    const res = await POST(makeRequest(), { params: projectParams });
    expect(res.status).toBe(201);
    expect(mockPrisma.milestone.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: "New Milestone", phaseNumber: 1, order: 3, projectId }),
      })
    );
  });

  it("sets order to 1 when no existing milestones", async () => {
    mockPrisma.milestone.findFirst.mockResolvedValue(null);
    await POST(makeRequest(), { params: projectParams });
    const call = mockPrisma.milestone.create.mock.calls[0][0];
    expect(call.data.order).toBe(1);
  });

  it("rejects learner", async () => {
    mockSession.value = { user: { id: learnerId, roles: ["LEARNER"] } };
    const res = await POST(makeRequest(), { params: projectParams });
    expect(res.status).toBe(401);
  });

  it("rejects non-owner consultant", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({ ...projectBase, creatorId: "other" });
    const res = await POST(makeRequest(), { params: projectParams });
    expect(res.status).toBe(403);
  });

  it("rejects DONE project", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({ ...projectBase, status: "DONE" });
    const res = await POST(makeRequest(), { params: projectParams });
    expect(res.status).toBe(400);
  });

  it("rejects invalid body", async () => {
    const res = await POST(makeRequest({ title: "" }), { params: projectParams });
    expect(res.status).toBe(400);
  });

  it("rejects unauthenticated", async () => {
    mockSession.value = null;
    const res = await POST(makeRequest(), { params: projectParams });
    expect(res.status).toBe(401);
  });
});
