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

  it("returns normalized custom domain hosts for repository resolution", () => {
    expect(resolveStoreSlugFromHostHeader("lojavelaudos.com.br")).toBe(
      "lojavelaudos.com.br",
    );
    expect(resolveStoreSlugFromHostHeader("Demo.Customer-Site.com")).toBe(
      "demo.customer-site.com",
    );
  });

  it("strips port and lowercases", () => {
    expect(
      resolveStoreSlugFromHostHeader("LojaExemplo.lojaveiculos.com.br:8080"),
    ).toBe("lojaexemplo");
  });

  it("does not resolve local development hosts as store slugs", () => {
    expect(resolveStoreSlugFromHostHeader("localhost:8787")).toBeNull();
    expect(resolveStoreSlugFromHostHeader("127.0.0.1:8787")).toBeNull();
    expect(resolveStoreSlugFromHostHeader("192.168.1.96:8787")).toBeNull();
    expect(resolveStoreSlugFromHostHeader("0.0.0.0:8787")).toBeNull();
    expect(resolveStoreSlugFromHostHeader("[::1]:8787")).toBeNull();
    expect(resolveStoreSlugFromHostHeader("::1")).toBeNull();
  });

  it("extracts from x-forwarded-host on request", async () => {
    const context = await captureContext(
      new Request("https://fallback.lojaveiculos.com.br", {
        headers: { "x-forwarded-host": "StoreFront.Lojaveiculos.com.br:3000" },
      }),
    );

    expect(resolveStoreSlugFromRequest(context as Context)).toBe("storefront");
  });

  it("prefers explicit store slug header on request", async () => {
    const context = await captureContext(
      new Request("https://fallback.lojaveiculos.com.br", {
        headers: {
          host: "fallback.lojaveiculos.com.br",
          "x-store-slug": "Demo-Loja",
        },
      }),
    );

    expect(resolveStoreSlugFromRequest(context as Context)).toBe("demo-loja");
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
