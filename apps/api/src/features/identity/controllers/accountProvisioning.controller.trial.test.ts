import { describe, expect, it } from "vitest";
import {
  createFeature,
  createRepository,
  profile,
} from "./accountProvisioning.controller.testSupport.js";

describe("account provisioning trial", () => {
  it("creates an owner store with the complete safe trial catalog", async () => {
    const repository = createRepository();
    const app = createFeature(repository);

    const response = await app.request("/onboarding/owner-store", {
      body: JSON.stringify({
        publicSlug: "auto-prime",
        storeTradingName: "Auto Prime",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      entitlements: [
        "subdomain",
        "automation",
        "analytics",
        "compliance",
        "plate_lookup",
      ],
    });
    expect(repository.createOwnerStore).toHaveBeenCalledWith(
      expect.objectContaining({
        publicSlug: "auto-prime",
        storeTradingName: "Auto Prime",
        user: profile,
      }),
    );
  });
});
