import { describe, expect, it } from "vitest";
import { resolveAutomationCapabilities } from "./automationPermissions";

describe("automation permissions", () => {
  it("maps each mutation to its exact permission and fails closed", () => {
    expect(resolveAutomationCapabilities(undefined)).toEqual({
      canApprove: false,
      canCancel: false,
      canRun: false,
    });
    expect(
      resolveAutomationCapabilities(["automation.run", "automation.cancel"]),
    ).toEqual({
      canApprove: false,
      canCancel: true,
      canRun: true,
    });
    expect(resolveAutomationCapabilities(["automation.approve"])).toEqual({
      canApprove: true,
      canCancel: false,
      canRun: false,
    });
  });
});
