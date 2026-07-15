import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const providerQueryFiles = [
  "drizzleCrmBotIntegrationRepository.ts",
  "drizzleCrmConnectionRepository.ts",
  "drizzleCrmWhatsappScheduledMessages.ts",
] as const;

describe("CRM provider entitlement query contracts", () => {
  it.each(providerQueryFiles)(
    "%s revalidates CRM access and active store lifecycle",
    (fileName) => {
      const source = readFileSync(new URL(fileName, import.meta.url), "utf8");

      expect(source).toContain("storeEntitlements");
      expect(source).toContain('featureKey, "crm"');
      expect(source).toContain('status, "active"');
      expect(source).toContain('status, "trialing"');
      expect(source).toContain("storeEntitlements.startsAt");
      expect(source).toContain("storeEntitlements.endsAt");
      expect(source).toContain("stores.isDeleted");
      expect(source).toContain("tenants.isDeleted");
    },
  );
});
