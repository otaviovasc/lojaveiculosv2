import { describe, expect, it } from "vitest";
import { uazapiProviderResponseError } from "./uazapiCrmWhatsappErrors.js";

describe("uazapiProviderResponseError", () => {
  it.each([401, 403])(
    "maps HTTP %i to provider_auth_failed keeping the provider status in the message",
    (status) => {
      const error = uazapiProviderResponseError(status, "UAZAPI status");

      expect(error.code).toBe("provider_auth_failed");
      expect(error.status).toBe(502);
      expect(error.message).toContain(`HTTP ${status}`);
    },
  );

  it("keeps the existing branches unchanged", () => {
    expect(uazapiProviderResponseError(429, "UAZAPI status").code).toBe(
      "rate_limited",
    );
    expect(uazapiProviderResponseError(500, "UAZAPI status").code).toBe(
      "provider_unavailable",
    );
    expect(uazapiProviderResponseError(422, "UAZAPI status").code).toBe(
      "provider_rejected",
    );
  });
});
