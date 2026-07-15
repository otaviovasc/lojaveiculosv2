import type { Page, Route } from "@playwright/test";
import { createCampaignLeads } from "./crm-whatsapp-campaign-lead-fixtures";
import {
  campaignId,
  createCampaign,
  createCampaignBootstrap,
  createCampaignConnection,
  createCampaignRecipients,
  createCampaignSessionCounts,
  createCampaignSessions,
  repliedTagId,
  warmTagId,
} from "./crm-whatsapp-campaigns-fixtures";

export async function installNoopCampaignEventSource(page: Page) {
  await page.addInitScript(() => {
    class NoopEventSource {
      onerror: ((event: Event) => void) | null = null;
      onopen: ((event: Event) => void) | null = null;
      readonly url: string;
      constructor(url: string) {
        this.url = url;
        setTimeout(() => this.onopen?.(new Event("open")), 0);
      }
      addEventListener() {}
      close() {}
    }
    window.EventSource = NoopEventSource as typeof EventSource;
  });
}

export async function installCampaignApiMocks(page: Page) {
  await page.route("**/api/v1/session/bootstrap", (route) =>
    fulfillJson(route, createCampaignBootstrap()),
  );
  await page.route("**/api/v1/identity/roles", (route) =>
    fulfillJson(route, createWhatsappRoleManagement()),
  );
  await page.route("**/crm/whatsapp/events/ticket", (route) =>
    fulfillJson(route, { ticket: "campaigns-e2e-ticket" }),
  );
  await page.route("**/crm/whatsapp/connections", (route) =>
    fulfillJson(route, { connections: [createCampaignConnection()] }),
  );
  await page.route("**/crm/whatsapp/quick-messages", (route) =>
    fulfillJson(route, []),
  );
  await page.route("**/crm/whatsapp/tags**", (route) =>
    fulfillJson(route, [
      { color: "green", emoji: null, id: warmTagId, name: "Oferta enviada" },
      { color: "blue", emoji: null, id: repliedTagId, name: "Respondeu" },
    ]),
  );
  await page.route("**/crm/whatsapp/session-counts**", (route) =>
    fulfillJson(route, createCampaignSessionCounts()),
  );
  await page.route("**/crm/whatsapp/messages/**", (route) =>
    fulfillJson(route, [
      {
        content: "Tenho interesse no Civic.",
        createdAt: "2026-07-07T12:00:00.000Z",
        direction: "INBOUND",
        id: "msg-1",
        senderType: "CUSTOMER",
        status: "DELIVERED",
        type: "TEXT",
      },
    ]),
  );
  await page.route("**/crm/whatsapp/sessions**", (route) =>
    fulfillJson(route, createCampaignSessions()),
  );
  await page.route("**/crm/leads**", (route) =>
    fulfillJson(route, { leads: createCampaignLeads() }),
  );
  await page.route("**/crm/whatsapp/campaigns**", (route) =>
    fulfillJson(route, [createCampaign()]),
  );
  await page.route(`**/crm/whatsapp/campaigns/${campaignId}`, (route) =>
    fulfillJson(route, {
      campaign: createCampaign(),
      recipients: createCampaignRecipients(),
    }),
  );
}

function createWhatsappRoleManagement() {
  const permissions = ["crm.whatsapp.assign", "crm.whatsapp.list"];
  return {
    actor: {
      canManageRoles: true,
      membershipId: "membership-owner",
      role: "owner",
    },
    memberships: [
      {
        basePermissions: permissions,
        effectivePermissions: permissions,
        manageable: false,
        membershipId: "membership-owner",
        overrides: [],
        role: "owner",
        status: "active",
        user: {
          email: "owner@example.com",
          id: "70000000-0000-4000-8000-000000000001",
          name: "Seed Owner",
        },
      },
      {
        basePermissions: permissions,
        effectivePermissions: permissions,
        manageable: true,
        membershipId: "membership-bruno",
        overrides: [],
        role: "salesman",
        status: "active",
        user: {
          email: "bruno@example.com",
          id: "70000000-0000-4000-8000-000000000002",
          name: "Bruno Santos",
        },
      },
    ],
    pendingInvitations: [],
    permissionGroups: [],
    roles: [],
  };
}

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    status: 200,
  });
}
