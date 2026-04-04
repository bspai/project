import { vi } from "vitest";

interface MockSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: "CONSULTANT" | "LEARNER" | "ADMIN";
  };
  expires: string;
}

let currentSession: MockSession | null = null;

export function setMockSession(session: MockSession | null) {
  currentSession = session;
}

export function mockConsultantSession(userId: string, name = "Test Consultant"): MockSession {
  return {
    user: { id: userId, email: "consultant@test.com", name, role: "CONSULTANT" },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

export function mockLearnerSession(userId: string, name = "Test Learner"): MockSession {
  return {
    user: { id: userId, email: "learner@test.com", name, role: "LEARNER" },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

export function mockAdminSession(userId: string, name = "Test Admin"): MockSession {
  return {
    user: { id: userId, email: "admin@test.com", name, role: "ADMIN" },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Call this in your test file to mock next-auth's getServerSession.
 * Use setMockSession() in beforeEach to control what session is returned.
 */
export function setupAuthMock() {
  vi.mock("next-auth", async () => {
    const actual = await vi.importActual("next-auth");
    return {
      ...actual,
      getServerSession: vi.fn(() => currentSession),
    };
  });
}

export function getCurrentMockSession() {
  return currentSession;
}
