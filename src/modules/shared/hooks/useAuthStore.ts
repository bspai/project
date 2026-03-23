// src/modules/shared/hooks/useAuthStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Role } from "@prisma/client";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  image?: string | null;
}

interface AuthStore {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  isConsultant: () => boolean;
  isLearner: () => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      setUser: (user) => set({ user }),
      isConsultant: () => get().user?.role === "CONSULTANT",
      isLearner: () => get().user?.role === "LEARNER",
      isAdmin: () => get().user?.role === "ADMIN",
    }),
    { name: "lms-auth" }
  )
);
