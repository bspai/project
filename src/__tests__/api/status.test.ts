import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockSession, mockTx, mockPrisma } = vi.hoisted(() => {
  const mockSession = { value: null as Record<string, unknown> | null };
  const mockTx = {
    project: { update: vi.fn() },
    notification: { createMany: vi.fn() },
    usageEvent: { create: vi.fn() },
    comment: { create: vi.fn() },
  };
  const mockPrisma = {
    project: { findUnique: vi.fn() },
    $transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<void>) => fn(mockTx)),
  };
  return { mockSession, mockTx, mockPrisma };
});
vi.mock("next-auth", () => ({ getServerSession: vi.fn(() => mockSession.value) }));
vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }));

import { PATCH } from "@/app/api/projects/[id]/status/route";

const projectId = "proj1";
const consultantId = "c1";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest(`http://localhost:3000/api/projects/${projectId}/status`, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const params = Promise.resolve({ id: projectId });

const projectBase = {
  id: projectId,
  title: "Test Project",
  creatorId: consultantId,
  status: "IN_PROGRESS",
  assignees: [],
};

describe("PATCH /api/projects/[id]/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.value = { user: { id: consultantId, roles: ["CONSULTANT"] } };
    mockPrisma.project.findUnique.mockResolvedValue(projectBase);
  });

  it("allows consultant to set status to DONE", async () => {
    const res = await PATCH(makeRequest({ status: "DONE" }), { params });
    expect(res.status).toBe(200);
    expect(mockTx.project.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "DONE" }) })
    );
  });

  it("allows setting to ON_HOLD", async () => {
    const res = await PATCH(makeRequest({ status: "ON_HOLD" }), { params });
    expect(res.status).toBe(200);
  });

  it("allows setting to OPEN", async () => {
    const res = await PATCH(makeRequest({ status: "OPEN" }), { params });
    expect(res.status).toBe(200);
  });

  it("allows setting to IN_PROGRESS", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({ ...projectBase, status: "ON_HOLD" });
    const res = await PATCH(makeRequest({ status: "IN_PROGRESS" }), { params });
    expect(res.status).toBe(200);
  });

  it("rejects invalid status value", async () => {
    const res = await PATCH(makeRequest({ status: "ARCHIVED" }), { params });
    expect(res.status).toBe(400);
  });

  it("rejects update on ARCHIVED project", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({ ...projectBase, status: "ARCHIVED" });
    const res = await PATCH(makeRequest({ status: "OPEN" }), { params });
    expect(res.status).toBe(400);
  });

  it("rejects non-owner consultant", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({ ...projectBase, creatorId: "other" });
    const res = await PATCH(makeRequest({ status: "DONE" }), { params });
    expect(res.status).toBe(403);
  });

  it("rejects learner", async () => {
    mockSession.value = { user: { id: "l1", roles: ["LEARNER"] } };
    const res = await PATCH(makeRequest({ status: "DONE" }), { params });
    expect(res.status).toBe(401);
  });

  it("rejects unauthenticated", async () => {
    mockSession.value = null;
    const res = await PATCH(makeRequest({ status: "DONE" }), { params });
    expect(res.status).toBe(401);
  });
});
