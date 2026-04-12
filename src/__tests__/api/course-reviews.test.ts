import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockSession, mockPrisma } = vi.hoisted(() => {
  const mockSession = { value: null as Record<string, unknown> | null };
  const mockPrisma = {
    courseReview: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    enrollment: { findUnique: vi.fn() },
    lesson: { count: vi.fn() },
  };
  return { mockSession, mockPrisma };
});

vi.mock("next-auth", () => ({ getServerSession: vi.fn(() => mockSession.value) }));
vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }));

import { GET, POST } from "@/app/api/courses/[id]/reviews/route";
import { PATCH, DELETE } from "@/app/api/courses/[id]/reviews/[reviewId]/route";

const learnerSession = { user: { id: "l1", roles: ["LEARNER"] } };
const adminSession   = { user: { id: "a1", roles: ["ADMIN"] } };

const courseId  = "c1";
const reviewId  = "r1";
const params    = Promise.resolve({ id: courseId });
const revParams = Promise.resolve({ id: courseId, reviewId });

const reviewBase = {
  id: reviewId, rating: 4, body: "Great course!", courseId, learnerId: "l1",
  createdAt: new Date(), updatedAt: new Date(),
  learner: { id: "l1", name: "Learner", avatar: null },
};

const enrollmentWithAllComplete = {
  id: "enr1", courseId, learnerId: "l1",
  progress: [{ isComplete: true }, { isComplete: true }],
};

function makeReq(url: string, body?: Record<string, unknown>, method = "POST") {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ─── GET ─────────────────────────────────────────────────────────────────────

describe("GET /api/courses/[id]/reviews", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns reviews and avg for a course", async () => {
    mockPrisma.courseReview.findMany.mockResolvedValue([reviewBase]);
    const req = new NextRequest(`http://localhost/api/courses/${courseId}/reviews`);
    const res = await GET(req, { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.count).toBe(1);
    expect(data.avg).toBe(4);
    expect(data.reviews).toHaveLength(1);
  });

  it("returns null avg when no reviews", async () => {
    mockPrisma.courseReview.findMany.mockResolvedValue([]);
    const req = new NextRequest(`http://localhost/api/courses/${courseId}/reviews`);
    const res = await GET(req, { params });
    const data = await res.json();
    expect(data.avg).toBeNull();
    expect(data.count).toBe(0);
  });

  it("computes avg correctly across multiple reviews", async () => {
    mockPrisma.courseReview.findMany.mockResolvedValue([
      { ...reviewBase, rating: 5 },
      { ...reviewBase, id: "r2", rating: 3 },
    ]);
    const req = new NextRequest(`http://localhost/api/courses/${courseId}/reviews`);
    const res = await GET(req, { params });
    const data = await res.json();
    expect(data.avg).toBe(4);
    expect(data.count).toBe(2);
  });
});

// ─── POST ─────────────────────────────────────────────────────────────────────

describe("POST /api/courses/[id]/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.value = learnerSession;
    mockPrisma.enrollment.findUnique.mockResolvedValue(enrollmentWithAllComplete);
    mockPrisma.lesson.count.mockResolvedValue(2);
    mockPrisma.courseReview.upsert.mockResolvedValue(reviewBase);
  });

  it("rejects unauthenticated", async () => {
    mockSession.value = null;
    const res = await POST(makeReq(`http://localhost/api/courses/${courseId}/reviews`, { rating: 4 }), { params });
    expect(res.status).toBe(401);
  });

  it("rejects non-enrolled learner", async () => {
    mockPrisma.enrollment.findUnique.mockResolvedValue(null);
    const res = await POST(makeReq(`http://localhost/api/courses/${courseId}/reviews`, { rating: 4 }), { params });
    expect(res.status).toBe(403);
  });

  it("rejects learner who has not completed all lessons", async () => {
    mockPrisma.enrollment.findUnique.mockResolvedValue({
      ...enrollmentWithAllComplete,
      progress: [{ isComplete: true }, { isComplete: false }],
    });
    mockPrisma.lesson.count.mockResolvedValue(2);
    const res = await POST(makeReq(`http://localhost/api/courses/${courseId}/reviews`, { rating: 4 }), { params });
    expect(res.status).toBe(403);
  });

  it("rejects rating below 1", async () => {
    const res = await POST(makeReq(`http://localhost/api/courses/${courseId}/reviews`, { rating: 0 }), { params });
    expect(res.status).toBe(400);
  });

  it("rejects rating above 5", async () => {
    const res = await POST(makeReq(`http://localhost/api/courses/${courseId}/reviews`, { rating: 6 }), { params });
    expect(res.status).toBe(400);
  });

  it("creates review for completed enrolled learner", async () => {
    const res = await POST(makeReq(`http://localhost/api/courses/${courseId}/reviews`, { rating: 4, body: "Great!" }), { params });
    expect(res.status).toBe(200);
    expect(mockPrisma.courseReview.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ rating: 4, learnerId: "l1", courseId }),
      })
    );
  });

  it("allows review without body", async () => {
    const res = await POST(makeReq(`http://localhost/api/courses/${courseId}/reviews`, { rating: 5 }), { params });
    expect(res.status).toBe(200);
  });
});

// ─── PATCH ────────────────────────────────────────────────────────────────────

describe("PATCH /api/courses/[id]/reviews/[reviewId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.value = learnerSession;
    mockPrisma.courseReview.findUnique.mockResolvedValue(reviewBase);
    mockPrisma.courseReview.update.mockResolvedValue({ ...reviewBase, rating: 5 });
  });

  it("rejects unauthenticated", async () => {
    mockSession.value = null;
    const res = await PATCH(makeReq(`http://localhost/api/courses/${courseId}/reviews/${reviewId}`, { rating: 5 }, "PATCH"), { params: revParams });
    expect(res.status).toBe(401);
  });

  it("rejects non-owner", async () => {
    mockSession.value = { user: { id: "other", roles: ["LEARNER"] } };
    const res = await PATCH(makeReq(`http://localhost/api/courses/${courseId}/reviews/${reviewId}`, { rating: 5 }, "PATCH"), { params: revParams });
    expect(res.status).toBe(403);
  });

  it("owner can update rating", async () => {
    const res = await PATCH(makeReq(`http://localhost/api/courses/${courseId}/reviews/${reviewId}`, { rating: 5 }, "PATCH"), { params: revParams });
    expect(res.status).toBe(200);
    expect(mockPrisma.courseReview.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ rating: 5 }) })
    );
  });
});

// ─── DELETE ───────────────────────────────────────────────────────────────────

describe("DELETE /api/courses/[id]/reviews/[reviewId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.value = learnerSession;
    mockPrisma.courseReview.findUnique.mockResolvedValue(reviewBase);
    mockPrisma.courseReview.delete.mockResolvedValue(reviewBase);
  });

  it("rejects unauthenticated", async () => {
    mockSession.value = null;
    const res = await DELETE(makeReq(`http://localhost/api/courses/${courseId}/reviews/${reviewId}`, undefined, "DELETE"), { params: revParams });
    expect(res.status).toBe(401);
  });

  it("rejects non-owner non-admin", async () => {
    mockSession.value = { user: { id: "other", roles: ["LEARNER"] } };
    const res = await DELETE(makeReq(`http://localhost/api/courses/${courseId}/reviews/${reviewId}`, undefined, "DELETE"), { params: revParams });
    expect(res.status).toBe(403);
  });

  it("owner can delete own review", async () => {
    const res = await DELETE(makeReq(`http://localhost/api/courses/${courseId}/reviews/${reviewId}`, undefined, "DELETE"), { params: revParams });
    expect(res.status).toBe(200);
  });

  it("admin can delete any review", async () => {
    mockSession.value = adminSession;
    const res = await DELETE(makeReq(`http://localhost/api/courses/${courseId}/reviews/${reviewId}`, undefined, "DELETE"), { params: revParams });
    expect(res.status).toBe(200);
  });

  it("returns 404 for missing review", async () => {
    mockPrisma.courseReview.findUnique.mockResolvedValue(null);
    const res = await DELETE(makeReq(`http://localhost/api/courses/${courseId}/reviews/${reviewId}`, undefined, "DELETE"), { params: revParams });
    expect(res.status).toBe(404);
  });
});
