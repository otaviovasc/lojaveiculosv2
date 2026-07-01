import { describe, expect, it } from "vitest";
import {
  createFeature,
  createRepository,
} from "./accountProvisioning.controller.testSupport.js";

describe("account provisioning validation responses", () => {
  it("normalizes valid owner onboarding CNPJ payloads", async () => {
    const repository = createRepository();
    const app = createFeature(repository);

    const response = await app.request("/onboarding/owner-store", {
      body: JSON.stringify({
        profile: { documentNumber: "11222333000181" },
        publicSlug: "auto-prime",
        storeTradingName: "Auto Prime",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(201);
    expect(repository.createOwnerStore).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: { documentNumber: "11.222.333/0001-81" },
      }),
    );
  });

  it("returns field-level issues for invalid owner onboarding payloads", async () => {
    const repository = createRepository();
    const app = createFeature(repository);

    const response = await app.request("/onboarding/owner-store", {
      body: JSON.stringify({
        profile: { documentNumber: "11.111.111/1111-11" },
        publicSlug: "auto-prime",
        storeTradingName: "Auto Prime",
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as {
      issues?: Array<{ message?: string; path?: string }>;
      message?: string;
      requestId?: string;
    };
    expect(body.message).toBe("Request body is invalid.");
    expect(body.requestId).toEqual(expect.any(String));
    expect(body.issues).toContainEqual(
      expect.objectContaining({
        message: "Informe um CNPJ válido.",
        path: "profile.documentNumber",
      }),
    );
  });
});
