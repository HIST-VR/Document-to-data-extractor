import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: [
        "shared/normalize.ts",
        "shared/validate.ts",
        "shared/identifiers.ts",
        "shared/dates.ts",
        "shared/money-words.ts",
      ],
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 90,
        perFile: true,
      },
    },
  },
});
