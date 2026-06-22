import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const apiProxy = {
  "/api": {
    changeOrigin: true,
    headers: {
      "x-forwarded-host":
        process.env.VITE_DEV_PUBLIC_STORE_HOST ??
        "test-store.lojaveiculos.com.br",
    },
    target: process.env.VITE_DEV_API_PROXY_TARGET ?? "http://localhost:8787",
  },
};

export default defineConfig({
  build: {
    modulePreload: {
      polyfill: false,
    },
  },
  plugins: [react(), tailwindcss()],
  preview: {
    proxy: apiProxy,
  },
  server: {
    proxy: apiProxy,
  },
});
