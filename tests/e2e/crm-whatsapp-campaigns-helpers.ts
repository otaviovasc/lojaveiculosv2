import type { Page, Route } from "@playwright/test";
import { createCampaignLeads } from "./crm-whatsapp-campaign-lead-fixtures";
import {
  campaignId,
  createCampaign,
  createCampaignBootstrap,
  createCampaignConnection,
  createCampaignRecipients,
  createCampaignRoutingPolicy,
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
  await page.route("**/api/v1/crm/events/ticket", (route) =>
    fulfillJson(route, { ticket: "campaigns-e2e-ticket" }),
  );
  await page.route("**/api/v1/crm/channel-connections", (route) =>
    fulfillJson(route, {
      allowance: { limit: 1, remaining: 0, used: 1 },
      availableSetups: [],
      connections: [createCampaignConnection()],
    }),
  );
  await page.route("**/api/v1/crm/routing-policy", (route) =>
    fulfillJson(route, createCampaignRoutingPolicy()),
  );
  await page.route("**/api/v1/crm/quick-messages", (route) =>
    fulfillJson(route, []),
  );
  await page.route("**/api/v1/crm/tags**", (route) =>
    fulfillJson(route, [
      { color: "green", emoji: null, id: warmTagId, name: "Oferta enviada" },
      { color: "blue", emoji: null, id: repliedTagId, name: "Respondeu" },
    ]),
  );
  await page.route("**/api/v1/crm/conversation-cycles/counts**", (route) =>
    fulfillJson(route, createCampaignSessionCounts()),
  );
  await page.route("**/api/v1/crm/conversation-cycles/*/messages**", (route) =>
    fulfillJson(route, [
      {
        channel: "whatsapp",
        content: "Tenho interesse no Civic.",
        createdAt: "2026-07-07T12:00:00.000Z",
        direction: "INBOUND",
        id: "msg-1",
        senderOrigin: "customer",
        senderType: "CUSTOMER",
        status: "DELIVERED",
        type: "TEXT",
      },
    ]),
  );
  await page.route(/\/api\/v1\/crm\/conversation-cycles(?:\?.*)?$/, (route) =>
    fulfillJson(route, createCampaignSessions()),
  );
  await page.route("**/crm/leads**", (route) =>
    fulfillJson(route, { leads: createCampaignLeads() }),
  );
  await page.route("**/api/v1/crm/campaigns**", (route) =>
    fulfillJson(route, [createCampaign()]),
  );
  await page.route(`**/api/v1/crm/campaigns/${campaignId}`, (route) =>
    fulfillJson(route, {
      campaign: createCampaign(),
      recipients: createCampaignRecipients(),
    }),
  );
}

function createWhatsappRoleManagement() {
  const permissions = [
    "crm.messaging.connection.pair",
    "crm.messaging.connection.setup",
    "crm.conversations.assign",
    "crm.conversations.read",
  ];
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
