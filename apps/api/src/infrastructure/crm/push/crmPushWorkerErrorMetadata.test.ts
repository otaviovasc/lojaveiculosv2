import { describe, expect, it } from "vitest";
import { toCrmPushWorkerErrorMetadata } from "./crmPushWorkerErrorMetadata.js";

describe("CRM push worker error metadata", () => {
  it("surfaces the safe PostgreSQL cause instead of a Drizzle query wrapper", () => {
    const databaseError = Object.assign(
      new Error('relation "crm_push_notification_outbox" does not exist'),
      { code: "42P01", name: "PostgresError" },
    );
    const wrappedError = new Error("Failed query: select ...", {
      cause: databaseError,
    });

    expect(toCrmPushWorkerErrorMetadata(wrappedError)).toEqual({
      errorCauseName: "PostgresError",
      errorCode: "42P01",
      errorMessage: 'relation "crm_push_notification_outbox" does not exist',
      errorName: "Error",
    });
  });

  it("bounds and redacts configuration diagnostics", () => {
    const error = new Error(
      `ONESIGNAL_API_KEY=secret-value ${"x".repeat(1_000)}`,
    );

    const metadata = toCrmPushWorkerErrorMetadata(error);

    expect(metadata.errorMessage).not.toContain("secret-value");
    expect(metadata.errorMessage.length).toBeLessThanOrEqual(500);
  });
});
