import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "../useAuthStore";

describe("useAuthStore", () => {
  beforeEach(() => {
    // Reset store state between tests
    useAuthStore.setState({ user: null });
  });

  it("has null user by default", () => {
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("setUser stores a user", () => {
    const mockUser = { id: "1", name: "Alice", email: "a@b.com", roles: ["CONSULTANT" as const] };
    useAuthStore.getState().setUser(mockUser);
    expect(useAuthStore.getState().user).toEqual(mockUser);
  });

  it("setUser(null) clears the user", () => {
    useAuthStore.getState().setUser({ id: "1", name: "A", email: "a@b.com", roles: ["LEARNER" as const] });
    useAuthStore.getState().setUser(null);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("isConsultant returns true for CONSULTANT role", () => {
    useAuthStore.getState().setUser({ id: "1", name: "A", email: "a@b.com", roles: ["CONSULTANT"] });
    expect(useAuthStore.getState().isConsultant()).toBe(true);
  });

  it("isLearner returns true for LEARNER role", () => {
    useAuthStore.getState().setUser({ id: "1", name: "A", email: "a@b.com", roles: ["LEARNER"] });
    expect(useAuthStore.getState().isLearner()).toBe(true);
  });

  it("isAdmin returns true for ADMIN role", () => {
    useAuthStore.getState().setUser({ id: "1", name: "A", email: "a@b.com", roles: ["ADMIN"] });
    expect(useAuthStore.getState().isAdmin()).toBe(true);
  });

  it("isConsultant returns false for non-CONSULTANT", () => {
    useAuthStore.getState().setUser({ id: "1", name: "A", email: "a@b.com", roles: ["LEARNER"] });
    expect(useAuthStore.getState().isConsultant()).toBe(false);
  });

  it("role checks return false when no user", () => {
    expect(useAuthStore.getState().isConsultant()).toBe(false);
    expect(useAuthStore.getState().isLearner()).toBe(false);
    expect(useAuthStore.getState().isAdmin()).toBe(false);
  });
});
