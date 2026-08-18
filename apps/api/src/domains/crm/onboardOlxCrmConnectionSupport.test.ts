import { describe, expect, it } from "vitest";
import { configureOlxCapability } from "./onboardOlxCrmConnectionSupport.js";
import { CrmConnectionSetupProviderError } from "./ports/crmConnectionSetupProvider.js";

describe("configureOlxCapability", () => {
  it("preserves an indeterminate provider outcome instead of calling the runtime unavailable", async () => {
    const result = await configureOlxCapability(
      "chat",
      ["chat"],
      "messaging",
      async () => {
        throw new CrmConnectionSetupProviderError(
          "OLX internal activation failure",
          "provider_outcome_indeterminate",
          500,
          undefined,
          undefined,
          false,
        );
      },
    );

    expect(result).toEqual({
      capability: "messaging",
      grantState: "granted",
      reason: "provider_outcome_indeterminate",
      status: "error",
    });
  });
});
