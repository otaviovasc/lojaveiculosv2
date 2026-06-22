import { describe, expect, it } from "vitest";
import { resolveRuntimeRepassesCrmClient } from "./runtimeCrmServices.js";

describe("runtime CRM services", () => {
  it("uses the local WhatsApp demo client for autonomous local QA", async () => {
    const client = resolveRuntimeRepassesCrmClient({
      APP_ENV: "local",
      LOCAL_AUTH_BYPASS: "true",
      REPASSES_CRM_LOCAL_DEMO: "true",
    });
    if (!client) throw new Error("Expected local Repasses CRM demo client.");

    const sessions = readDemoSessions(
      await client.listSessions({ clerkSessionToken: "local-token" }),
    );
    const marina = sessions.find(
      (session) => session.buyerName === "Marina Oliveira",
    );

    expect(marina?.lastMessageContent).toContain("Civic");
  });

  it("keeps production on the disabled client when no Repasses URL exists", async () => {
    const client = resolveRuntimeRepassesCrmClient({
      APP_ENV: "production",
      LOCAL_AUTH_BYPASS: "true",
    });

    expect(client).toBeUndefined();
  });

  it("ignores unresolved Railway placeholder URLs", () => {
    expect(
      resolveRuntimeRepassesCrmClient({
        APP_ENV: "production",
        REPASSES_CRM_API_URL:
          "https://${{repasses-backend.RAILWAY_PUBLIC_DOMAIN}}/api/v1",
      }),
    ).toBeUndefined();
  });
});

function readDemoSessions(payload: unknown) {
  if (!Array.isArray(payload)) throw new Error("Expected session array.");
  return payload as Array<{ buyerName?: string; lastMessageContent?: string }>;
}
