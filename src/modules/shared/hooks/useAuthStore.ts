// src/modules/shared/hooks/useAuthStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Role } from "@prisma/client";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  roles: Role[];
  image?: string | null;
}

interface AuthStore {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  isConsultant: () => boolean;
  isLearner: () => boolean;
  isAdmin: () => boolean;
  isMentor: () => boolean;
  hasRole: (role: Role) => boolean;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      setUser: (user) => set({ user }),
      isConsultant: () => get().user?.roles.includes("CONSULTANT") ?? false,
      isLearner: () => get().user?.roles.includes("LEARNER") ?? false,
      isAdmin: () => get().user?.roles.includes("ADMIN") ?? false,
      isMentor: () => get().user?.roles.includes("MENTOR") ?? false,
      hasRole: (role) => get().user?.roles.includes(role) ?? false,
    }),
    { name: "lms-auth" }
  )
);
