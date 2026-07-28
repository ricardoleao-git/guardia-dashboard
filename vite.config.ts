import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    strictPort: false,
    host: true,
    allowedHosts: [".manus.computer"],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  test: {
    // jsdom porque o alvo inclui componente (PageStateWrapper); os testes de
    // lógica pura rodariam sem, mas manter um ambiente evita duas configs.
    environment: "jsdom",
    globals: true,
    setupFiles: [path.resolve(import.meta.dirname, "client/src/test/setup.ts")],
    // `root` acima aponta para client/ para o build; os testes moram lá também.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    restoreMocks: true,
  },
});
