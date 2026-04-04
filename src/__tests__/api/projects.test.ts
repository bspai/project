import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockSession, mockPrisma } = vi.hoisted(() => {
  const mockSession = { value: null as Record<string, unknown> | null };
  const mockPrisma = {
    project: { create: vi.fn(), findMany: vi.fn() },
    projectVersion: { create: vi.fn() },
  };
  return { mockSession, mockPrisma };
});

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(() => mockSession.value),
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }));

// Import after mocking
import { POST, GET } from "@/app/api/projects/route";

function makeRequest(body: Record<string, unknown>, method = "POST") {
  return new NextRequest("http://localhost:3000/api/projects", {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeGetRequest(params?: Record<string, string>) {
  const url = new URL("http://localhost:3000/api/projects");
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  return new NextRequest(url, { method: "GET" });
}

const validBody = {
  title: "Test Project",
  deadline: "2025-12-01T00:00:00Z",
  technologies: ["React"],
  milestones: [{ id: "m1", title: "M1", deadline: "2025-10-01", phaseNumber: 1 }],
  descriptionJson: { type: "doc", content: [] },
  descriptionText: "A test project description",
};

describe("POST /api/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.value = null;
  });

  it("rejects unauthenticated request", async () => {
    mockSession.value = null;
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);
  });

  it("rejects LEARNER role", async () => {
    mockSession.value = { user: { id: "u1", role: "LEARNER" } };
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);
  });

  it("rejects invalid body (missing title)", async () => {
    mockSession.value = { user: { id: "u1", role: "CONSULTANT" } };
    const res = await POST(makeRequest({ ...validBody, title: "" }));
    expect(res.status).toBe(400);
  });

  it("rejects empty technologies array", async () => {
    mockSession.value = { user: { id: "u1", role: "CONSULTANT" } };
    const res = await POST(makeRequest({ ...validBody, technologies: [] }));
    expect(res.status).toBe(400);
  });

  it("rejects title under 3 chars", async () => {
    mockSession.value = { user: { id: "u1", role: "CONSULTANT" } };
    const res = await POST(makeRequest({ ...validBody, title: "ab" }));
    expect(res.status).toBe(400);
  });

  it("creates project with valid data", async () => {
    mockSession.value = { user: { id: "c1", role: "CONSULTANT" } };
    mockPrisma.project.create.mockResolvedValue({ id: "proj1" });
    mockPrisma.projectVersion.create.mockResolvedValue({ id: "v1" });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBe("proj1");
  });

  it("creates project with correct data structure", async () => {
    mockSession.value = { user: { id: "c1", role: "CONSULTANT" } };
    mockPrisma.project.create.mockResolvedValue({ id: "proj1" });
    mockPrisma.projectVersion.create.mockResolvedValue({ id: "v1" });

    await POST(makeRequest(validBody));

    expect(mockPrisma.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Test Project",
          status: "OPEN",
          currentPhase: 1,
          creatorId: "c1",
        }),
      })
    );
  });

  it("creates version 1 as SELF_APPROVED", async () => {
    mockSession.value = { user: { id: "c1", role: "CONSULTANT" } };
    mockPrisma.project.create.mockResolvedValue({ id: "proj1" });
    mockPrisma.projectVersion.create.mockResolvedValue({ id: "v1" });

    await POST(makeRequest(validBody));

    expect(mockPrisma.projectVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          versionNumber: 1,
          isActive: true,
          status: "SELF_APPROVED",
          phaseNumber: 1,
        }),
      })
    );
  });

  it("stores metaSnapshot on version", async () => {
    mockSession.value = { user: { id: "c1", role: "CONSULTANT" } };
    mockPrisma.project.create.mockResolvedValue({ id: "proj1" });
    mockPrisma.projectVersion.create.mockResolvedValue({ id: "v1" });

    await POST(makeRequest(validBody));

    const versionCall = mockPrisma.projectVersion.create.mock.calls[0][0];
    expect(versionCall.data.metaSnapshot).toEqual(
      expect.objectContaining({
        title: "Test Project",
        technologies: ["React"],
      })
    );
  });
});

describe("GET /api/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.value = null;
  });

  it("rejects unauthenticated request", async () => {
    mockSession.value = null;
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it("returns projects for consultant", async () => {
    mockSession.value = { user: { id: "c1", role: "CONSULTANT" } };
    mockPrisma.project.findMany.mockResolvedValue([{ id: "p1", title: "Project 1" }]);

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
  });

  it("filters consultant projects by creatorId", async () => {
    mockSession.value = { user: { id: "c1", role: "CONSULTANT" } };
    mockPrisma.project.findMany.mockResolvedValue([]);

    await GET(makeGetRequest());

    expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ creatorId: "c1" }),
      })
    );
  });

  it("filters by status param", async () => {
    mockSession.value = { user: { id: "c1", role: "CONSULTANT" } };
    mockPrisma.project.findMany.mockResolvedValue([]);

    await GET(makeGetRequest({ status: "OPEN" }));

    expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "OPEN" }),
      })
    );
  });

  it("filters by search param", async () => {
    mockSession.value = { user: { id: "c1", role: "CONSULTANT" } };
    mockPrisma.project.findMany.mockResolvedValue([]);

    await GET(makeGetRequest({ search: "React" }));

    expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          title: { contains: "React", mode: "insensitive" },
        }),
      })
    );
  });

  it("learner sees OPEN projects by default", async () => {
    mockSession.value = { user: { id: "l1", role: "LEARNER" } };
    mockPrisma.project.findMany.mockResolvedValue([]);

    await GET(makeGetRequest());

    expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "OPEN" }),
      })
    );
  });
});
