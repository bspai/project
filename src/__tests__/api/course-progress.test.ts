import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockSession, mockPrisma } = vi.hoisted(() => {
  const mockSession = { value: null as Record<string, unknown> | null };
  const mockPrisma = {
    enrollment: { findUnique: vi.fn() },
    lesson: { findFirst: vi.fn() },
    lessonProgress: { upsert: vi.fn() },
  };
  return { mockSession, mockPrisma };
});

vi.mock("next-auth", () => ({ getServerSession: vi.fn(() => mockSession.value) }));
vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }));

import { POST } from "@/app/api/courses/[id]/progress/route";

const learnerSession = { user: { id: "l1", roles: ["LEARNER"] } };
const courseId = "c1";
const lessonId = "ls1";
const params = Promise.resolve({ id: courseId });

const enrollment = { id: "enr1", courseId, learnerId: "l1", progress: [] };
const lesson = { id: lessonId, moduleId: "mod1" };

function makeReq(body: Record<string, unknown>) {
  return new NextRequest(`http://localhost/api/courses/${courseId}/progress`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/courses/[id]/progress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.value = learnerSession;
    mockPrisma.enrollment.findUnique.mockResolvedValue(enrollment);
    mockPrisma.lesson.findFirst.mockResolvedValue(lesson);
    mockPrisma.lessonProgress.upsert.mockResolvedValue({
      id: "p1", lessonId, learnerId: "l1", isComplete: true, completedAt: new Date(),
    });
  });

  it("rejects unauthenticated", async () => {
    mockSession.value = null;
    const res = await POST(makeReq({ lessonId, isComplete: true }), { params });
    expect(res.status).toBe(401);
  });

  it("rejects learner not enrolled in course", async () => {
    mockPrisma.enrollment.findUnique.mockResolvedValue(null);
    const res = await POST(makeReq({ lessonId, isComplete: true }), { params });
    expect(res.status).toBe(403);
  });

  it("rejects missing lessonId", async () => {
    const res = await POST(makeReq({ isComplete: true }), { params });
    expect(res.status).toBe(400);
  });

  it("rejects missing isComplete", async () => {
    const res = await POST(makeReq({ lessonId }), { params });
    expect(res.status).toBe(400);
  });

  it("rejects lesson not in this course", async () => {
    mockPrisma.lesson.findFirst.mockResolvedValue(null);
    const res = await POST(makeReq({ lessonId, isComplete: true }), { params });
    expect(res.status).toBe(404);
  });

  it("marks lesson complete", async () => {
    const res = await POST(makeReq({ lessonId, isComplete: true }), { params });
    expect(res.status).toBe(200);
    expect(mockPrisma.lessonProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ isComplete: true }),
        update: expect.objectContaining({ isComplete: true }),
      })
    );
  });

  it("marks lesson incomplete", async () => {
    mockPrisma.lessonProgress.upsert.mockResolvedValue({
      id: "p1", lessonId, learnerId: "l1", isComplete: false, completedAt: null,
    });
    const res = await POST(makeReq({ lessonId, isComplete: false }), { params });
    expect(res.status).toBe(200);
    expect(mockPrisma.lessonProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ isComplete: false, completedAt: null }),
      })
    );
  });

  it("sets completedAt when marking complete", async () => {
    await POST(makeReq({ lessonId, isComplete: true }), { params });
    const call = mockPrisma.lessonProgress.upsert.mock.calls[0][0];
    expect(call.create.completedAt).toBeInstanceOf(Date);
    expect(call.update.completedAt).toBeInstanceOf(Date);
  });

  it("clears completedAt when marking incomplete", async () => {
    await POST(makeReq({ lessonId, isComplete: false }), { params });
    const call = mockPrisma.lessonProgress.upsert.mock.calls[0][0];
    expect(call.create.completedAt).toBeNull();
    expect(call.update.completedAt).toBeNull();
  });
});
