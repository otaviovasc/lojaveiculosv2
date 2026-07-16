import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createSpaServer } from "./server.mjs";

const cleanups = [];

afterEach(async () => {
  await Promise.all(cleanups.splice(0).map((cleanup) => cleanup()));
});

describe("production SPA server", () => {
  it("serves liveness and client-side routes", async () => {
    const runtime = await startServer();

    const health = await fetch(`${runtime.origin}/health`);
    const route = await fetch(`${runtime.origin}/inventory/listings`);

    expect(health.status).toBe(200);
    await expect(health.json()).resolves.toEqual({ ok: true });
    expect(route.status).toBe(200);
    await expect(route.text()).resolves.toContain("Loja Veiculos");
  });

  it("does not return the SPA document for missing assets", async () => {
    const runtime = await startServer();

    const response = await fetch(`${runtime.origin}/assets/missing.js`);

    expect(response.status).toBe(404);
  });
});

async function startServer() {
  const directory = await mkdtemp(join(tmpdir(), "lojaveiculos-web-"));
  await writeFile(
    join(directory, "index.html"),
    "<!doctype html><title>Loja Veiculos</title>",
  );
  const server = createSpaServer({ distDirectory: directory });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected a TCP test server address.");
  }
  cleanups.push(
    async () =>
      new Promise((resolveClose, rejectClose) => {
        server.close((error) => {
          if (error) rejectClose(error);
          else resolveClose();
        });
      }),
    () => rm(directory, { force: true, recursive: true }),
  );
  return { origin: `http://127.0.0.1:${String(address.port)}` };
}
