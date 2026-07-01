import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath } from "url";

const apiProxy = {
  "/api": {
    changeOrigin: true,
    ...(process.env.VITE_DEV_PUBLIC_STORE_HOST
      ? {
          headers: {
            "x-forwarded-host": process.env.VITE_DEV_PUBLIC_STORE_HOST,
          },
        }
      : {}),
    target: process.env.VITE_DEV_API_PROXY_TARGET ?? "http://localhost:8787",
  },
};

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  build: {
    modulePreload: {
      polyfill: false,
    },
  },
  envDir: workspaceRoot,
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
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
