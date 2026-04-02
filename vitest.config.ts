import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: [
            "src/lib/**/__tests__/**/*.test.ts",
            "src/modules/**/__tests__/**/*.test.ts",
            "src/modules/**/hooks/__tests__/**/*.test.ts",
          ],
          exclude: ["src/__tests__/api/**"],
          environment: "happy-dom",
        },
      },
      {
        extends: true,
        test: {
          name: "components",
          include: [
            "src/modules/**/__tests__/**/*.test.tsx",
          ],
          environment: "happy-dom",
          setupFiles: ["src/__tests__/setup/component-setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["src/__tests__/api/**/*.test.ts"],
          environment: "node",
          testTimeout: 15000,
          hookTimeout: 30000,
          sequence: { concurrent: false },
        },
      },
    ],
  },
});
