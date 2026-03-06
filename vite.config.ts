import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@rpg": resolve(__dirname, "src/rpg"),
      "@sim": resolve(__dirname, "src/sim"),
      "@view": resolve(__dirname, "src/view"),
      "@world": resolve(__dirname, "src/world"),
      "@input": resolve(__dirname, "src/input"),
      "@audio": resolve(__dirname, "src/audio"),
      "@net": resolve(__dirname, "src/net"),
      "@": resolve(__dirname, "src"),
    },
  },
  server: {
    port: 8080,
    open: true,
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/sim/**"],
    },
  },
});
