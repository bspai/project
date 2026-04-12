import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockSession, mockPrisma } = vi.hoisted(() => {
  const mockSession = { value: null as Record<string, unknown> | null };
  const mockPrisma = {
    course: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    enrollment: { findUnique: vi.fn() },
  };
  return { mockSession, mockPrisma };
});

vi.mock("next-auth", () => ({ getServerSession: vi.fn(() => mockSession.value) }));
vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }));

import { GET as listCourses, POST as createCourse } from "@/app/api/courses/route";
import { GET as getCourse, PUT as updateCourse, DELETE as deleteCourse } from "@/app/api/courses/[id]/route";
import { PATCH as updateStatus } from "@/app/api/courses/[id]/status/route";

const mentorSession = { user: { id: "m1", roles: ["MENTOR"] } };
const learnerSession = { user: { id: "l1", roles: ["LEARNER"] } };
const adminSession = { user: { id: "a1", roles: ["ADMIN"] } };

const courseBase = {
  id: "c1",
  title: "Intro to Testing",
  description: "Learn testing",
  coverImage: null,
  status: "DRAFT",
  isOpen: true,
  creatorId: "m1",
  creator: { id: "m1", name: "Mentor" },
  updatedAt: new Date(),
  modules: [],
  _count: { enrollments: 0 },
};

const params = Promise.resolve({ id: "c1" });

// ─── GET /api/courses ─────────────────────────────────────────────────────────

describe("GET /api/courses", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects unauthenticated", async () => {
    mockSession.value = null;
    const req = new NextRequest("http://localhost/api/courses");
    const res = await listCourses(req);
    expect(res.status).toBe(401);
  });

  it("returns mentor's own courses", async () => {
    mockSession.value = mentorSession;
    mockPrisma.course.findMany.mockResolvedValue([courseBase]);
    const req = new NextRequest("http://localhost/api/courses");
    const res = await listCourses(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
  });

  it("mentor query scoped to own courses", async () => {
    mockSession.value = mentorSession;
    mockPrisma.course.findMany.mockResolvedValue([]);
    const req = new NextRequest("http://localhost/api/courses");
    await listCourses(req);
    expect(mockPrisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ creatorId: "m1" }) })
    );
  });

  it("learner only sees published courses", async () => {
    mockSession.value = learnerSession;
    mockPrisma.course.findMany.mockResolvedValue([]);
    const req = new NextRequest("http://localhost/api/courses");
    await listCourses(req);
    expect(mockPrisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: "PUBLISHED" }) })
    );
  });
});

// ─── POST /api/courses ────────────────────────────────────────────────────────

describe("POST /api/courses", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeReq(body: Record<string, unknown>) {
    return new NextRequest("http://localhost/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("rejects non-mentor", async () => {
    mockSession.value = learnerSession;
    const res = await createCourse(makeReq({ title: "Test", isOpen: true }));
    expect(res.status).toBe(401);
  });

  it("rejects title shorter than 3 chars", async () => {
    mockSession.value = mentorSession;
    const res = await createCourse(makeReq({ title: "Ab" }));
    expect(res.status).toBe(400);
  });

  it("creates course for mentor", async () => {
    mockSession.value = mentorSession;
    mockPrisma.course.create.mockResolvedValue({ ...courseBase, id: "new1" });
    const res = await createCourse(makeReq({ title: "New Course", isOpen: true }));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBe("new1");
  });

  it("assigns creatorId from session", async () => {
    mockSession.value = mentorSession;
    mockPrisma.course.create.mockResolvedValue(courseBase);
    await createCourse(makeReq({ title: "Course Title", isOpen: true }));
    expect(mockPrisma.course.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ creatorId: "m1" }) })
    );
  });

  it("new course defaults to DRAFT status", async () => {
    mockSession.value = mentorSession;
    mockPrisma.course.create.mockResolvedValue(courseBase);
    await createCourse(makeReq({ title: "Draft Course", isOpen: true }));
    expect(mockPrisma.course.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "DRAFT" }) })
    );
  });
});

// ─── GET /api/courses/[id] ────────────────────────────────────────────────────

describe("GET /api/courses/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 for missing course", async () => {
    mockSession.value = mentorSession;
    mockPrisma.course.findUnique.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/courses/c1");
    const res = await getCourse(req, { params });
    expect(res.status).toBe(404);
  });

  it("mentor creator can see own DRAFT course", async () => {
    mockSession.value = mentorSession;
    mockPrisma.course.findUnique.mockResolvedValue(courseBase);
    const req = new NextRequest("http://localhost/api/courses/c1");
    const res = await getCourse(req, { params });
    expect(res.status).toBe(200);
  });

  it("learner cannot see DRAFT course", async () => {
    mockSession.value = learnerSession;
    mockPrisma.course.findUnique.mockResolvedValue(courseBase); // status: DRAFT
    const req = new NextRequest("http://localhost/api/courses/c1");
    const res = await getCourse(req, { params });
    expect(res.status).toBe(404);
  });

  it("learner can see PUBLISHED course", async () => {
    mockSession.value = learnerSession;
    mockPrisma.course.findUnique.mockResolvedValue({ ...courseBase, status: "PUBLISHED" });
    mockPrisma.enrollment.findUnique.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/courses/c1");
    const res = await getCourse(req, { params });
    expect(res.status).toBe(200);
  });
});

// ─── PUT /api/courses/[id] ────────────────────────────────────────────────────

describe("PUT /api/courses/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeReq(body: Record<string, unknown>) {
    return new NextRequest("http://localhost/api/courses/c1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("rejects non-mentor", async () => {
    mockSession.value = learnerSession;
    const res = await updateCourse(makeReq({ title: "Updated" }), { params });
    expect(res.status).toBe(401);
  });

  it("rejects non-owner mentor", async () => {
    mockSession.value = { user: { id: "other-mentor", roles: ["MENTOR"] } };
    mockPrisma.course.findUnique.mockResolvedValue(courseBase); // creatorId: m1
    const res = await updateCourse(makeReq({ title: "Updated" }), { params });
    expect(res.status).toBe(403);
  });

  it("owner mentor can update title", async () => {
    mockSession.value = mentorSession;
    mockPrisma.course.findUnique.mockResolvedValue(courseBase);
    mockPrisma.course.update.mockResolvedValue({ ...courseBase, title: "Updated" });
    const res = await updateCourse(makeReq({ title: "Updated Title" }), { params });
    expect(res.status).toBe(200);
  });
});

// ─── DELETE /api/courses/[id] ─────────────────────────────────────────────────

describe("DELETE /api/courses/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeReq() {
    return new NextRequest("http://localhost/api/courses/c1", { method: "DELETE" });
  }

  it("rejects non-owner", async () => {
    mockSession.value = { user: { id: "other", roles: ["MENTOR"] } };
    mockPrisma.course.findUnique.mockResolvedValue(courseBase);
    const res = await deleteCourse(makeReq(), { params });
    expect(res.status).toBe(403);
  });

  it("owner can delete DRAFT course", async () => {
    mockSession.value = mentorSession;
    mockPrisma.course.findUnique.mockResolvedValue(courseBase);
    mockPrisma.course.delete.mockResolvedValue(courseBase);
    const res = await deleteCourse(makeReq(), { params });
    expect(res.status).toBe(200);
  });

  it("rejects admin (delete is MENTOR-only)", async () => {
    mockSession.value = adminSession;
    const res = await deleteCourse(makeReq(), { params });
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /api/courses/[id]/status ──────────────────────────────────────────

describe("PATCH /api/courses/[id]/status", () => {
  beforeEach(() => vi.clearAllMocks());

  function makeReq(body: Record<string, unknown>) {
    return new NextRequest("http://localhost/api/courses/c1/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("rejects non-mentor", async () => {
    mockSession.value = learnerSession;
    const res = await updateStatus(makeReq({ status: "PUBLISHED" }), { params });
    expect(res.status).toBe(401);
  });

  it("rejects non-owner mentor", async () => {
    mockSession.value = { user: { id: "other-mentor", roles: ["MENTOR"] } };
    mockPrisma.course.findUnique.mockResolvedValue(courseBase);
    const res = await updateStatus(makeReq({ status: "PUBLISHED" }), { params });
    expect(res.status).toBe(403);
  });

  it("rejects invalid status value", async () => {
    mockSession.value = mentorSession;
    mockPrisma.course.findUnique.mockResolvedValue(courseBase);
    const res = await updateStatus(makeReq({ status: "DELETED" }), { params });
    expect(res.status).toBe(400);
  });

  it("owner can publish course with content", async () => {
    mockSession.value = mentorSession;
    mockPrisma.course.findUnique.mockResolvedValue({
      ...courseBase,
      modules: [{ id: "mod1", lessons: [{ id: "l1" }] }],
    });
    mockPrisma.course.update.mockResolvedValue({ ...courseBase, status: "PUBLISHED" });
    const res = await updateStatus(makeReq({ status: "PUBLISHED" }), { params });
    expect(res.status).toBe(200);
  });

  it("rejects publishing course with no modules (409)", async () => {
    mockSession.value = mentorSession;
    mockPrisma.course.findUnique.mockResolvedValue({ ...courseBase, modules: [] });
    const res = await updateStatus(makeReq({ status: "PUBLISHED" }), { params });
    expect(res.status).toBe(409);
  });
});
