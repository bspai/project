import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockSession, mockPrisma } = vi.hoisted(() => {
  const mockSession = { value: null as Record<string, unknown> | null };
  const mockPrisma = {
    project: { findUnique: vi.fn() },
    projectVersion: { create: vi.fn(), findFirst: vi.fn() },
  };
  return { mockSession, mockPrisma };
});
vi.mock("next-auth", () => ({ getServerSession: vi.fn(() => mockSession.value) }));
vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }));

import { POST } from "@/app/api/projects/[id]/versions/route";

const projectId = "proj1";
const consultantId = "c1";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest(`http://localhost:3000/api/projects/${projectId}/versions`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const params = Promise.resolve({ id: projectId });

const validBody = {
  title: "Updated Title",
  deadline: "2025-12-01",
  technologies: ["React"],
  milestones: [{ id: "m1", title: "M1", deadline: "2025-10-01", phaseNumber: 1 }],
  descriptionJson: { type: "doc", content: [] },
  descriptionText: "Updated description text",
};

describe("POST /api/projects/[id]/versions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.value = { user: { id: consultantId, role: "CONSULTANT" } };
    mockPrisma.project.findUnique.mockResolvedValue({
      id: projectId,
      creatorId: consultantId,
      currentPhase: 1,
      versions: [{ versionNumber: 1 }],
    });
    mockPrisma.projectVersion.findFirst.mockResolvedValue(null);
    mockPrisma.projectVersion.create.mockResolvedValue({ id: "v2" });
  });

  it("creates a PENDING version", async () => {
    const res = await POST(makeRequest(validBody), { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.versionNumber).toBe(2);
  });

  it("creates version with correct status and isActive", async () => {
    await POST(makeRequest(validBody), { params });

    expect(mockPrisma.projectVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isActive: false,
          status: "PENDING",
          versionNumber: 2,
        }),
      })
    );
  });

  it("stores metaSnapshot with submitted data", async () => {
    await POST(makeRequest(validBody), { params });

    const call = mockPrisma.projectVersion.create.mock.calls[0][0];
    expect(call.data.metaSnapshot).toEqual(
      expect.objectContaining({
        title: "Updated Title",
        technologies: ["React"],
      })
    );
  });

  it("rejects unauthenticated request", async () => {
    mockSession.value = null;
    const res = await POST(makeRequest(validBody), { params });
    expect(res.status).toBe(401);
  });

  it("rejects non-consultant", async () => {
    mockSession.value = { user: { id: "l1", role: "LEARNER" } };
    const res = await POST(makeRequest(validBody), { params });
    expect(res.status).toBe(401);
  });

  it("rejects non-owner consultant", async () => {
    mockSession.value = { user: { id: "other-consultant", role: "CONSULTANT" } };
    const res = await POST(makeRequest(validBody), { params });
    expect(res.status).toBe(403);
  });

  it("rejects if pending version exists", async () => {
    mockPrisma.projectVersion.findFirst.mockResolvedValue({ id: "existing-pending" });
    const res = await POST(makeRequest(validBody), { params });
    expect(res.status).toBe(409);
  });

  it("rejects invalid body", async () => {
    const res = await POST(makeRequest({ title: "ab" }), { params });
    expect(res.status).toBe(400);
  });
});
