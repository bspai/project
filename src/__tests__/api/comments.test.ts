import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockSession, mockPrisma } = vi.hoisted(() => {
  const mockSession = { value: null as Record<string, unknown> | null };
  const mockPrisma = {
    project: { findUnique: vi.fn() },
    comment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
  return { mockSession, mockPrisma };
});
vi.mock("next-auth", () => ({ getServerSession: vi.fn(() => mockSession.value) }));
vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }));

import { GET, POST } from "@/app/api/projects/[id]/comments/route";
import { PATCH, DELETE } from "@/app/api/projects/[id]/comments/[commentId]/route";

const projectId = "proj1";
const consultantId = "c1";
const learnerId = "l1";
const commentId = "com1";

const params = Promise.resolve({ id: projectId });
const commentParams = Promise.resolve({ id: projectId, commentId });

function makeRequest(method: string, body?: Record<string, unknown>, url = `/api/projects/${projectId}/comments`) {
  return new NextRequest(`http://localhost:3000${url}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : {},
  });
}

const projectBase = {
  id: projectId,
  creatorId: consultantId,
  status: "IN_PROGRESS",
  assignees: [{ learnerId }],
};

const commentBase = {
  id: commentId,
  body: "Hello world",
  createdAt: new Date().toISOString(),
  isEdited: false,
  author: { id: consultantId, name: "Alice", avatar: null, role: "CONSULTANT" },
  replies: [],
};

describe("GET /api/projects/[id]/comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.project.findUnique.mockResolvedValue(projectBase);
    mockPrisma.comment.findMany.mockResolvedValue([commentBase]);
  });

  it("returns comments for the consultant creator", async () => {
    mockSession.value = { user: { id: consultantId, role: "CONSULTANT" } };
    const res = await GET(makeRequest("GET"), { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe(commentId);
  });

  it("returns comments for the assigned learner", async () => {
    mockSession.value = { user: { id: learnerId, role: "LEARNER" } };
    const res = await GET(makeRequest("GET"), { params });
    expect(res.status).toBe(200);
  });

  it("returns 403 for unassigned learner", async () => {
    mockSession.value = { user: { id: "other-learner", role: "LEARNER" } };
    const res = await GET(makeRequest("GET"), { params });
    expect(res.status).toBe(403);
  });

  it("returns 401 when unauthenticated", async () => {
    mockSession.value = null;
    const res = await GET(makeRequest("GET"), { params });
    expect(res.status).toBe(401);
  });

  it("returns 404 when project not found", async () => {
    mockSession.value = { user: { id: consultantId, role: "CONSULTANT" } };
    mockPrisma.project.findUnique.mockResolvedValue(null);
    const res = await GET(makeRequest("GET"), { params });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/projects/[id]/comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.project.findUnique.mockResolvedValue(projectBase);
    mockPrisma.comment.findUnique.mockResolvedValue(null);
    mockPrisma.comment.create.mockResolvedValue({ ...commentBase, replies: [] });
  });

  it("creates a top-level comment as consultant", async () => {
    mockSession.value = { user: { id: consultantId, role: "CONSULTANT" } };
    const res = await POST(makeRequest("POST", { body: "A comment" }), { params });
    expect(res.status).toBe(201);
    expect(mockPrisma.comment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ body: "A comment", parentId: null, projectId, authorId: consultantId }),
      })
    );
  });

  it("creates a reply with parentId", async () => {
    mockSession.value = { user: { id: learnerId, role: "LEARNER" } };
    mockPrisma.comment.findUnique.mockResolvedValue({
      projectId,
      parentId: null, // parent is top-level — allowed
    });
    const res = await POST(makeRequest("POST", { body: "A reply", parentId: commentId }), { params });
    expect(res.status).toBe(201);
    expect(mockPrisma.comment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ parentId: commentId }),
      })
    );
  });

  it("rejects reply-to-reply (depth > 1)", async () => {
    mockSession.value = { user: { id: learnerId, role: "LEARNER" } };
    mockPrisma.comment.findUnique.mockResolvedValue({
      projectId,
      parentId: "some-parent", // this comment is itself a reply
    });
    const res = await POST(makeRequest("POST", { body: "Nested reply", parentId: commentId }), { params });
    expect(res.status).toBe(400);
  });

  it("rejects comment on ARCHIVED project", async () => {
    mockSession.value = { user: { id: consultantId, role: "CONSULTANT" } };
    mockPrisma.project.findUnique.mockResolvedValue({ ...projectBase, status: "ARCHIVED" });
    const res = await POST(makeRequest("POST", { body: "A comment" }), { params });
    expect(res.status).toBe(400);
  });

  it("returns 403 for unassigned learner", async () => {
    mockSession.value = { user: { id: "other-learner", role: "LEARNER" } };
    const res = await POST(makeRequest("POST", { body: "A comment" }), { params });
    expect(res.status).toBe(403);
  });

  it("returns 400 for empty body", async () => {
    mockSession.value = { user: { id: consultantId, role: "CONSULTANT" } };
    const res = await POST(makeRequest("POST", { body: "" }), { params });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/projects/[id]/comments/[commentId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.comment.findUnique.mockResolvedValue({ id: commentId, authorId: consultantId });
    mockPrisma.comment.update.mockResolvedValue({ ...commentBase, body: "Edited body", isEdited: true });
  });

  it("allows author to edit their comment", async () => {
    mockSession.value = { user: { id: consultantId, role: "CONSULTANT" } };
    const res = await PATCH(makeRequest("PATCH", { body: "Edited body" }), { params: commentParams });
    expect(res.status).toBe(200);
    expect(mockPrisma.comment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ body: "Edited body", isEdited: true }),
      })
    );
  });

  it("returns 403 when editing another user's comment", async () => {
    mockSession.value = { user: { id: learnerId, role: "LEARNER" } };
    const res = await PATCH(makeRequest("PATCH", { body: "Edited" }), { params: commentParams });
    expect(res.status).toBe(403);
  });

  it("returns 404 when comment not found", async () => {
    mockSession.value = { user: { id: consultantId, role: "CONSULTANT" } };
    mockPrisma.comment.findUnique.mockResolvedValue(null);
    const res = await PATCH(makeRequest("PATCH", { body: "Edited" }), { params: commentParams });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/projects/[id]/comments/[commentId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.comment.findUnique.mockResolvedValue({ id: commentId, authorId: consultantId });
    mockPrisma.comment.delete.mockResolvedValue({});
  });

  it("allows author to delete their comment", async () => {
    mockSession.value = { user: { id: consultantId, role: "CONSULTANT" } };
    const res = await DELETE(makeRequest("DELETE"), { params: commentParams });
    expect(res.status).toBe(204);
    expect(mockPrisma.comment.delete).toHaveBeenCalledWith({ where: { id: commentId } });
  });

  it("returns 403 when deleting another user's comment", async () => {
    mockSession.value = { user: { id: learnerId, role: "LEARNER" } };
    const res = await DELETE(makeRequest("DELETE"), { params: commentParams });
    expect(res.status).toBe(403);
  });

  it("returns 404 when comment not found", async () => {
    mockSession.value = { user: { id: consultantId, role: "CONSULTANT" } };
    mockPrisma.comment.findUnique.mockResolvedValue(null);
    const res = await DELETE(makeRequest("DELETE"), { params: commentParams });
    expect(res.status).toBe(404);
  });
});
