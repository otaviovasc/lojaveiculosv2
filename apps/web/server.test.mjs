import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
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
    await expect(health.json()).resolves.toEqual({
      build: {
        commitSha: "unknown",
        crmApiContractVersion: "crm-lead-session-v1",
      },
      ok: true,
    });
    expect(route.status).toBe(200);
    await expect(route.text()).resolves.toContain("Loja Veiculos");
  });

  it("does not return the SPA document for missing assets", async () => {
    const runtime = await startServer();

    const response = await fetch(`${runtime.origin}/assets/missing.js`);

    expect(response.status).toBe(404);
  });

  it("proxies /api/v1 requests to the configured API origin", async () => {
    const upstream = createServer(async (request, response) => {
      const body = await readRequestBody(request);
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({ body, method: request.method, url: request.url }),
      );
    });
    upstream.listen(0, "127.0.0.1");
    await once(upstream, "listening");
    const address = upstream.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected an API test server address.");
    }
    cleanups.push(() => closeServer(upstream));

    const runtime = await startServer({
      apiBaseUrl: `http://127.0.0.1:${String(address.port)}`,
    });
    const response = await fetch(
      `${runtime.origin}/api/v1/marketplaces/connect-url`,
      { body: '{"provider":"olx"}', method: "POST" },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      body: '{"provider":"olx"}',
      method: "POST",
      url: "/api/v1/marketplaces/connect-url",
    });
  });

  it("fails closed instead of serving the SPA when API routing is absent", async () => {
    const runtime = await startServer();

    const response = await fetch(`${runtime.origin}/api/v1/marketplaces`);

    expect(response.status).toBe(503);
  });
});

async function startServer(options = {}) {
  const directory = await mkdtemp(join(tmpdir(), "lojaveiculos-web-"));
  await writeFile(
    join(directory, "index.html"),
    "<!doctype html><title>Loja Veiculos</title>",
  );
  const server = createSpaServer({ ...options, distDirectory: directory });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected a TCP test server address.");
  }
  cleanups.push(
    () => closeServer(server),
    () => rm(directory, { force: true, recursive: true }),
  );
  return { origin: `http://127.0.0.1:${String(address.port)}` };
}

function closeServer(server) {
  return new Promise((resolveClose, rejectClose) => {
    server.close((error) => {
      if (error) rejectClose(error);
      else resolveClose();
    });
  });
}

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}
