import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath } from "url";
import webBundlePolicy from "../../tools/quality/web-bundle-policy.json" with { type: "json" };

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
    chunkSizeWarningLimit: webBundlePolicy.limits.javascript / 1_000,
    emptyOutDir: true,
    manifest: true,
    modulePreload: {
      polyfill: false,
    },
    outDir: "dist",
    reportCompressedSize: true,
    rolldownOptions: {
      output: {
        codeSplitting: true,
      },
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
