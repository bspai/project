import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockSession, mockPrisma } = vi.hoisted(() => {
  const mockSession = { value: null as Record<string, unknown> | null };
  const mockPrisma = {
    project: { findUnique: vi.fn() },
    workRequest: { findUnique: vi.fn(), create: vi.fn(), findMany: vi.fn() },
    notification: { create: vi.fn() },
    usageEvent: { create: vi.fn() },
  };
  return { mockSession, mockPrisma };
});
vi.mock("next-auth", () => ({ getServerSession: vi.fn(() => mockSession.value) }));
vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }));

import { POST, GET } from "@/app/api/projects/[id]/request/route";

const projectId = "proj1";
const consultantId = "c1";
const learnerId = "l1";

const params = Promise.resolve({ id: projectId });

function makePostRequest(body: Record<string, unknown> = {}) {
  return new NextRequest(`http://localhost:3000/api/projects/${projectId}/request`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeGetRequest() {
  return new NextRequest(`http://localhost:3000/api/projects/${projectId}/request`, {
    method: "GET",
  });
}

describe("POST /api/projects/[id]/request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.value = { user: { id: learnerId, roles: ["LEARNER"] } };
    mockPrisma.project.findUnique.mockResolvedValue({
      id: projectId,
      creatorId: consultantId,
      status: "OPEN",
      title: "Test Project",
    });
    mockPrisma.workRequest.findUnique.mockResolvedValue(null);
    mockPrisma.workRequest.create.mockResolvedValue({ id: "wr1" });
    mockPrisma.notification.create.mockResolvedValue({});
    mockPrisma.usageEvent.create.mockResolvedValue({});
  });

  it("creates work request", async () => {
    const res = await POST(makePostRequest({ message: "I want to work" }), { params });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBe("wr1");
  });

  it("creates notification for consultant", async () => {
    await POST(makePostRequest(), { params });

    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: consultantId,
          type: "WORK_REQUEST_RECEIVED",
        }),
      })
    );
  });

  it("creates usage event", async () => {
    await POST(makePostRequest(), { params });

    expect(mockPrisma.usageEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "work_request_sent",
          userId: learnerId,
        }),
      })
    );
  });

  it("rejects duplicate request", async () => {
    mockPrisma.workRequest.findUnique.mockResolvedValue({ id: "existing" });
    const res = await POST(makePostRequest(), { params });
    expect(res.status).toBe(409);
  });

  it("rejects non-OPEN project", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      id: projectId,
      status: "IN_PROGRESS",
    });
    const res = await POST(makePostRequest(), { params });
    expect(res.status).toBe(400);
  });

  it("rejects consultant role", async () => {
    mockSession.value = { user: { id: consultantId, roles: ["CONSULTANT"] } };
    const res = await POST(makePostRequest(), { params });
    expect(res.status).toBe(401);
  });

  it("rejects unauthenticated", async () => {
    mockSession.value = null;
    const res = await POST(makePostRequest(), { params });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/projects/[id]/request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.value = { user: { id: consultantId, roles: ["CONSULTANT"] } };
    mockPrisma.project.findUnique.mockResolvedValue({
      id: projectId,
      creatorId: consultantId,
    });
    mockPrisma.workRequest.findMany.mockResolvedValue([
      { id: "wr1", status: "PENDING", learner: { id: learnerId, name: "Learner" } },
    ]);
  });

  it("returns requests with learner info", async () => {
    const res = await GET(makeGetRequest(), { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].learner).toBeDefined();
  });

  it("rejects non-owner consultant", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      id: projectId,
      creatorId: "other-consultant",
    });
    const res = await GET(makeGetRequest(), { params });
    expect(res.status).toBe(403);
  });

  it("rejects learner role", async () => {
    mockSession.value = { user: { id: learnerId, roles: ["LEARNER"] } };
    const res = await GET(makeGetRequest(), { params });
    expect(res.status).toBe(401);
  });
});
