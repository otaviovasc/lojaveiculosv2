import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import type { Context } from "hono";
import {
  resolveStoreSlugFromHostHeader,
  resolveStoreSlugFromRequest,
} from "./storeScope.js";

describe("resolveStoreSlugFromHostHeader", () => {
  it("extracts first subdomain from base domain", () => {
    expect(
      resolveStoreSlugFromHostHeader("LojaExemplo.lojaveiculos.com.br"),
    ).toBe("lojaexemplo");
  });

  it("ignores apex and www hosts", () => {
    expect(resolveStoreSlugFromHostHeader("lojaveiculos.com.br")).toBeNull();
    expect(
      resolveStoreSlugFromHostHeader("www.lojaveiculos.com.br"),
    ).toBeNull();
  });

  it("returns null for custom domains", () => {
    expect(resolveStoreSlugFromHostHeader("lojavelaudos.com.br")).toBeNull();
    expect(resolveStoreSlugFromHostHeader("demo.customer-site.com")).toBeNull();
  });

  it("strips port and lowercases", () => {
    expect(
      resolveStoreSlugFromHostHeader("LojaExemplo.lojaveiculos.com.br:8080"),
    ).toBe("lojaexemplo");
  });

  it("extracts from x-forwarded-host on request", async () => {
    const context = await captureContext(
      new Request("https://fallback.lojaveiculos.com.br", {
        headers: { "x-forwarded-host": "StoreFront.Lojaveiculos.com.br:3000" },
      }),
    );

    expect(resolveStoreSlugFromRequest(context as Context)).toBe("storefront");
  });
});

async function captureContext(request: Request): Promise<Context> {
  let captured: unknown;
  const app = new Hono();
  app.all("*", (context) => {
    captured = context;
    return context.json({ ok: true });
  });

  await app.request(request);
  return captured as Context;
}
