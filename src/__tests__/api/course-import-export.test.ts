import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockSession, mockTx, mockPrisma } = vi.hoisted(() => {
  const mockSession = { value: null as Record<string, unknown> | null };
  const mockTx = {
    course: { create: vi.fn() },
    courseModule: { create: vi.fn() },
    lesson: { create: vi.fn() },
    contentBlock: { create: vi.fn() },
  };
  const mockPrisma = {
    course: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    $transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
  };
  return { mockSession, mockTx, mockPrisma };
});

vi.mock("next-auth", () => ({ getServerSession: vi.fn(() => mockSession.value) }));
vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }));

import { GET as exportCourse } from "@/app/api/admin/courses/[id]/export/route";
import { POST as importCourse } from "@/app/api/admin/courses/import/route";

const adminSession  = { user: { id: "a1", roles: ["ADMIN"] } };
const mentorSession = { user: { id: "m1", roles: ["MENTOR"] } };

const courseId = "c1";
const exportParams = Promise.resolve({ id: courseId });

const fullCourse = {
  id: courseId,
  title: "Test Course",
  description: "A description",
  coverImage: null,
  status: "PUBLISHED",
  isOpen: true,
  creatorId: "m1",
  creator: { name: "Mentor One", email: "mentor@test.com" },
  modules: [
    {
      id: "mod1", title: "Module 1", order: 1,
      lessons: [
        {
          id: "ls1", title: "Lesson 1", order: 1, duration: 10,
          blocks: [
            { id: "b1", type: "TEXT", title: null, order: 1, payload: { text: "Hello" } },
          ],
        },
      ],
    },
  ],
};

const validBundle = {
  __version: 1,
  exportedAt: new Date().toISOString(),
  originalCreator: { name: "Mentor One", email: "mentor@test.com" },
  course: {
    title: "Test Course",
    description: "A description",
    coverImage: null,
    status: "PUBLISHED",
    isOpen: true,
    modules: [
      {
        title: "Module 1", order: 1,
        lessons: [
          {
            title: "Lesson 1", order: 1, duration: 10,
            blocks: [{ type: "TEXT", title: null, order: 1, payload: { text: "Hello" } }],
          },
        ],
      },
    ],
  },
};

// ─── Export ───────────────────────────────────────────────────────────────────

describe("GET /api/admin/courses/[id]/export", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects non-admin", async () => {
    mockSession.value = mentorSession;
    const req = new NextRequest(`http://localhost/api/admin/courses/${courseId}/export`);
    const res = await exportCourse(req, { params: exportParams });
    expect(res.status).toBe(403);
  });

  it("rejects unauthenticated", async () => {
    mockSession.value = null;
    const req = new NextRequest(`http://localhost/api/admin/courses/${courseId}/export`);
    const res = await exportCourse(req, { params: exportParams });
    expect(res.status).toBe(403);
  });

  it("returns 404 for missing course", async () => {
    mockSession.value = adminSession;
    mockPrisma.course.findUnique.mockResolvedValue(null);
    const req = new NextRequest(`http://localhost/api/admin/courses/${courseId}/export`);
    const res = await exportCourse(req, { params: exportParams });
    expect(res.status).toBe(404);
  });

  it("returns JSON file with attachment disposition", async () => {
    mockSession.value = adminSession;
    mockPrisma.course.findUnique.mockResolvedValue(fullCourse);
    const req = new NextRequest(`http://localhost/api/admin/courses/${courseId}/export`);
    const res = await exportCourse(req, { params: exportParams });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toMatch(/attachment/);
    expect(res.headers.get("Content-Type")).toMatch(/application\/json/);
  });

  it("export bundle contains correct structure", async () => {
    mockSession.value = adminSession;
    mockPrisma.course.findUnique.mockResolvedValue(fullCourse);
    const req = new NextRequest(`http://localhost/api/admin/courses/${courseId}/export`);
    const res = await exportCourse(req, { params: exportParams });
    const bundle = await res.json();
    expect(bundle.__version).toBe(1);
    expect(bundle.course.title).toBe("Test Course");
    expect(bundle.course.modules).toHaveLength(1);
    expect(bundle.course.modules[0].lessons[0].blocks).toHaveLength(1);
    // IDs should be stripped from exported bundle
    expect(bundle.course.modules[0].id).toBeUndefined();
    expect(bundle.originalCreator.email).toBe("mentor@test.com");
  });
});

// ─── Import ───────────────────────────────────────────────────────────────────

describe("POST /api/admin/courses/import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.value = adminSession;
    mockPrisma.user.findUnique.mockResolvedValue({ id: "m2", roles: ["MENTOR"] });
    mockTx.course.create.mockResolvedValue({ id: "new1", title: "Test Course" });
    mockTx.courseModule.create.mockResolvedValue({ id: "mod-new" });
    mockTx.lesson.create.mockResolvedValue({ id: "ls-new" });
    mockTx.contentBlock.create.mockResolvedValue({ id: "b-new" });
  });

  function makeReq(body: Record<string, unknown>) {
    return new NextRequest("http://localhost/api/admin/courses/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("rejects non-admin", async () => {
    mockSession.value = mentorSession;
    const res = await importCourse(makeReq({ mentorId: "m2", bundle: validBundle }));
    expect(res.status).toBe(403);
  });

  it("rejects invalid bundle (missing __version)", async () => {
    const res = await importCourse(makeReq({ mentorId: "m2", bundle: { course: {} } }));
    expect(res.status).toBe(400);
  });

  it("rejects non-mentor user as target", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: "m2", roles: ["LEARNER"] });
    const res = await importCourse(makeReq({ mentorId: "m2", bundle: validBundle }));
    expect(res.status).toBe(400);
  });

  it("rejects non-existent mentor", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const res = await importCourse(makeReq({ mentorId: "ghost", bundle: validBundle }));
    expect(res.status).toBe(400);
  });

  it("creates course assigned to selected mentor", async () => {
    const res = await importCourse(makeReq({ mentorId: "m2", bundle: validBundle }));
    expect(res.status).toBe(201);
    expect(mockTx.course.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ creatorId: "m2" }) })
    );
  });

  it("respects importAsStatus override", async () => {
    const res = await importCourse(makeReq({ mentorId: "m2", bundle: validBundle, importAsStatus: "DRAFT" }));
    expect(res.status).toBe(201);
    expect(mockTx.course.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "DRAFT" }) })
    );
  });

  it("creates modules and lessons inside transaction", async () => {
    await importCourse(makeReq({ mentorId: "m2", bundle: validBundle }));
    expect(mockTx.courseModule.create).toHaveBeenCalledTimes(1);
    expect(mockTx.lesson.create).toHaveBeenCalledTimes(1);
    expect(mockTx.contentBlock.create).toHaveBeenCalledTimes(1);
  });

  it("returns new course id and title", async () => {
    const res = await importCourse(makeReq({ mentorId: "m2", bundle: validBundle }));
    const data = await res.json();
    expect(data.id).toBe("new1");
    expect(data.title).toBe("Test Course");
  });
});
