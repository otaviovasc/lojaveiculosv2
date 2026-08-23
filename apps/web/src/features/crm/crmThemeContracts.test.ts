import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function readStyle(fileName: string) {
  return readFileSync(
    fileURLToPath(new URL(`../../styles/${fileName}`, import.meta.url)),
    "utf8",
  );
}

describe("CRM theme contracts", () => {
  it("keeps shared select styling and scopes the CRM-specific surfaces", () => {
    const conversation = readStyle("crmConversation.css");
    const chat = readStyle("crmChat.css");
    const conclusion = readStyle("crmConclusionDialog.css");
    const scheduleWorkflow = readStyle("crmScheduleWorkflow.css");
    const schedules = readStyle("crmSchedules.css");

    expect(conversation).not.toMatch(/(?:^|,)\s*\.crm-select\s*\{/m);
    expect(chat).toContain(".crm-header-actions .crm-select");
    expect(conclusion).toContain(".crm-conclusion-panel .crm-select");
    expect(scheduleWorkflow).toContain(".crm-schedule-field .crm-select");
    expect(schedules).toContain(".crm-schedule-toolbar-controls .crm-select");
  });

  it("lets the token-aware composer layer own button states", () => {
    const core = readStyle("crm.css");
    const composer = readStyle("crmComposer.css");
    const polish = readStyle("crmConversationComposerPolish.css");

    expect(core).toContain("background: var(--color-success);");
    expect(core).toContain("color: var(--color-success-foreground);");
    expect(composer).not.toContain("!important");
    expect(composer).toContain("background: var(--color-success);");
    expect(polish).toContain("color: var(--color-success-foreground);");
  });

  it("uses theme tokens for live queue and conversation states", () => {
    const chat = readStyle("crmChat.css");
    const queue = readStyle("crmQueue.css");
    const sessions = readStyle("crmSessions.css");

    expect(chat).toContain(".crm-human-attendance-in-service");
    expect(chat).toContain(".crm-human-attendance-waiting");
    expect(queue).toContain(".crm-icon-action.crm-new-cycle-action");
    expect(queue).toContain("var(--color-crm-active-emerald)");
    expect(sessions).toContain("var(--color-success-strong) !important");
    expect(sessions).toContain("var(--color-info) !important");
  });

  it("keeps CRM icon and label controls on one readable line", () => {
    const chat = readStyle("crmChat.css");
    const conversation = readStyle("crmConversation.css");
    const queue = readStyle("crmQueue.css");
    const schedules = readStyle("crmSchedules.css");

    expect(chat).toContain(".crm-shell .crm-chat-channel-pill > svg");
    expect(chat).toContain(".crm-shell .crm-header-actions .crm-action > svg");
    expect(conversation).toContain(
      ".crm-page :is(.crm-cycle-chip, .crm-cycle-status) > svg",
    );
    expect(queue).toContain(".crm-bulk-confirm svg");
    expect(schedules).toContain(
      ".crm-schedule-toolbar-controls :is(.crm-action, .crm-icon-action) > svg",
    );
  });

  it("loads responsive connection rules after their base declarations", () => {
    const moduleStyles = readStyle("crm-module.css");
    const selfService = readStyle("crmSelfServiceSetup.css");
    const statusImport = moduleStyles.indexOf(
      'import "./crmConnectionStatus.css"',
    );
    const responsiveImport = moduleStyles.indexOf(
      'import "./crmConnectionAdminResponsive.css"',
    );

    expect(statusImport).toBeGreaterThan(-1);
    expect(responsiveImport).toBeGreaterThan(-1);
    expect(statusImport).toBeLessThan(responsiveImport);
    expect(selfService).toContain(".crm-connection-admin .crm-channel-row");
    expect(selfService).toContain(
      ".crm-connection-admin .crm-channel-identity",
    );
  });

  it("reserves space for message actions on touch pointers", () => {
    const messageActions = readStyle("crmMessageActions.css");

    expect(messageActions).toMatch(
      /@media \(hover: none\), \(pointer: coarse\)[\s\S]*\.crm-shell \.crm-bubble:has\(\.crm-message-actions\)[\s\S]*padding-top: 2\.5rem/,
    );
    expect(messageActions).toMatch(
      /@media \(hover: none\), \(pointer: coarse\)[\s\S]*\.crm-message-actions[\s\S]*top: 0\.25rem/,
    );
  });
});
