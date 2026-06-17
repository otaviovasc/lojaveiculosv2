import { verifyToken } from "@clerk/backend";
import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import { createClerkHttpIdentityVerifier } from "./clerkHttpIdentityVerifier.js";

vi.mock("@clerk/backend", () => ({
  verifyToken: vi.fn(),
}));

describe("createClerkHttpIdentityVerifier", () => {
  it("returns null when no bearer token is present", async () => {
    const verifier = createClerkHttpIdentityVerifier({ secretKey: "sk_test" });
    const context = await captureContext(new Request("https://api.local"));

    await expect(verifier.verify(context)).resolves.toBeNull();
    expect(verifyToken).not.toHaveBeenCalled();
  });

  it("verifies bearer tokens and returns Clerk subject", async () => {
    vi.mocked(verifyToken).mockResolvedValue({ sub: "user_clerk_1" } as never);
    const verifier = createClerkHttpIdentityVerifier({
      audience: ["lojaveiculosv2"],
      authorizedParties: ["https://app.lojaveiculos.com.br"],
      jwtKey: "jwt_key",
      secretKey: "sk_live",
    });
    const context = await captureContext(
      new Request("https://api.local", {
        headers: { authorization: "Bearer session_token" },
      }),
    );

    await expect(verifier.verify(context)).resolves.toEqual({
      clerkUserId: "user_clerk_1",
    });
    expect(verifyToken).toHaveBeenCalledWith("session_token", {
      audience: ["lojaveiculosv2"],
      authorizedParties: ["https://app.lojaveiculos.com.br"],
      jwtKey: "jwt_key",
      secretKey: "sk_live",
    });
  });

  it("rejects tokens without a subject", async () => {
    vi.mocked(verifyToken).mockResolvedValue({} as never);
    const verifier = createClerkHttpIdentityVerifier({ secretKey: "sk_test" });
    const context = await captureContext(
      new Request("https://api.local", {
        headers: { authorization: "Bearer session_token" },
      }),
    );

    await expect(verifier.verify(context)).rejects.toThrow(
      "Clerk token is missing subject.",
    );
  });
});

async function captureContext(request: Request) {
  let captured: unknown;
  const app = new Hono();
  app.all("*", (context) => {
    captured = context;
    return context.json({ ok: true });
  });

  await app.request(request);
  return captured as Parameters<
    ReturnType<typeof createClerkHttpIdentityVerifier>["verify"]
  >[0];
}
