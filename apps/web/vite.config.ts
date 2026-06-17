import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        changeOrigin: true,
        headers: {
          "x-forwarded-host":
            process.env.VITE_DEV_PUBLIC_STORE_HOST ??
            "test-store.lojaveiculos.com.br",
        },
        target:
          process.env.VITE_DEV_API_PROXY_TARGET ?? "http://localhost:8787",
      },
    },
  },
});
