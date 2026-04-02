import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    usageEvent: { create: vi.fn() },
  },
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }));

import { POST } from "@/app/api/analytics/track/route";

function makeRequest(body: Record<string, unknown>, headers?: Record<string, string>) {
  return new NextRequest("http://localhost:3000/api/analytics/track", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...headers },
  });
}

describe("POST /api/analytics/track", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.usageEvent.create.mockResolvedValue({ id: "ev1" });
  });

  it("tracks event with all fields", async () => {
    const body = {
      action: "page_view",
      entity: "project",
      entityId: "p1",
      projectId: "p1",
      metadata: { page: "/dashboard" },
      userId: "u1",
      sessionId: "sess1",
    };
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(200);
    expect(mockPrisma.usageEvent.create).toHaveBeenCalled();
  });

  it("tracks with minimal fields (action only)", async () => {
    const res = await POST(makeRequest({ action: "click" }));
    expect(res.status).toBe(200);
    expect(mockPrisma.usageEvent.create).toHaveBeenCalled();
  });

  it("hashes IP address", async () => {
    await POST(makeRequest({ action: "view" }, { "x-forwarded-for": "192.168.1.1" }));

    const call = mockPrisma.usageEvent.create.mock.calls[0][0];
    expect(call.data.ipHash).toBeDefined();
    expect(call.data.ipHash).toHaveLength(16);
    expect(call.data.ipHash).not.toBe("192.168.1.1");
  });

  it("returns 200 even on DB error (silent fail)", async () => {
    mockPrisma.usageEvent.create.mockRejectedValue(new Error("DB down"));
    const res = await POST(makeRequest({ action: "test" }));
    expect(res.status).toBe(200);
  });

  it("rejects missing action", async () => {
    const res = await POST(makeRequest({ entity: "project" }));
    expect(res.status).toBe(400);
  });
});
