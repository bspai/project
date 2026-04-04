import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockSession, mockPrisma } = vi.hoisted(() => {
  const mockSession = { value: null as Record<string, unknown> | null };
  const mockPrisma = {
    project: { findUnique: vi.fn(), update: vi.fn() },
  };
  return { mockSession, mockPrisma };
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
  creatorId: consultantId,
  status: "IN_PROGRESS",
};

describe("PATCH /api/projects/[id]/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.value = { user: { id: consultantId, role: "CONSULTANT" } };
    mockPrisma.project.findUnique.mockResolvedValue(projectBase);
    mockPrisma.project.update.mockResolvedValue({ id: projectId, status: "DONE" });
  });

  it("allows consultant to set status to DONE", async () => {
    const res = await PATCH(makeRequest({ status: "DONE" }), { params });
    expect(res.status).toBe(200);
    expect(mockPrisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "DONE" }) })
    );
  });

  it("allows setting to ON_HOLD", async () => {
    mockPrisma.project.update.mockResolvedValue({ id: projectId, status: "ON_HOLD" });
    const res = await PATCH(makeRequest({ status: "ON_HOLD" }), { params });
    expect(res.status).toBe(200);
  });

  it("allows setting to OPEN", async () => {
    mockPrisma.project.update.mockResolvedValue({ id: projectId, status: "OPEN" });
    const res = await PATCH(makeRequest({ status: "OPEN" }), { params });
    expect(res.status).toBe(200);
  });

  it("allows setting to IN_PROGRESS", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({ ...projectBase, status: "ON_HOLD" });
    mockPrisma.project.update.mockResolvedValue({ id: projectId, status: "IN_PROGRESS" });
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
    mockSession.value = { user: { id: "l1", role: "LEARNER" } };
    const res = await PATCH(makeRequest({ status: "DONE" }), { params });
    expect(res.status).toBe(401);
  });

  it("rejects unauthenticated", async () => {
    mockSession.value = null;
    const res = await PATCH(makeRequest({ status: "DONE" }), { params });
    expect(res.status).toBe(401);
  });
});
