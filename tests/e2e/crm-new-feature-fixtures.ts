import type { Page, Route } from "@playwright/test";
import {
  campaignConnectionId,
  createCampaign,
  createCampaignConnection,
  createCampaignLeads,
  createCampaignSessions,
} from "./crm-whatsapp-campaigns-fixtures";

export const secondCampaignConnectionId =
  "24000000-0000-4000-8000-000000000202";
export const birthDateLeadId = "crm-e2e-birthdate-lead";
export const e2ePipelineId = "crm-e2e-vendas";

export function createSpecialDateConfig(
  connectionId: string,
  dateType: SpecialDateType,
  overrides: Partial<SpecialDateConfig> = {},
): SpecialDateConfig {
  return {
    connectionId,
    dateType,
    enabled: true,
    id: `special-date-${connectionId}-${dateType}`,
    leadDays: 3,
    messageTemplate: "Olá {nome}, desejamos um dia especial!",
    sendTime: "09:00",
    ...overrides,
  };
}

export type SpecialDateType =
  | "birthday"
  | "purchaseAnniversary"
  | "easter"
  | "christmas"
  | "mothersDay"
  | "fathersDay"
  | "blackFriday";

export type SpecialDateConfig = {
  connectionId: string;
  dateType: SpecialDateType;
  enabled: boolean;
  id: string;
  leadDays: number;
  messageTemplate: string;
  sendTime: string;
};

export function createSpecialDateConfigs(connectionId: string) {
  const types: SpecialDateType[] = [
    "birthday",
    "purchaseAnniversary",
    "easter",
    "christmas",
    "mothersDay",
    "fathersDay",
    "blackFriday",
  ];
  return types.map((dateType) =>
    createSpecialDateConfig(connectionId, dateType),
  );
}

export async function installSpecialDateApiMocks(page: Page) {
  const configsByConnection = new Map<string, SpecialDateConfig[]>([
    [campaignConnectionId, createSpecialDateConfigs(campaignConnectionId)],
    [
      secondCampaignConnectionId,
      createSpecialDateConfigs(secondCampaignConnectionId).map((config) => ({
        ...config,
        messageTemplate: "Olá {nome}, mensagem da segunda conexão.",
      })),
    ],
  ]);
  const saves: Array<{
    connectionId: string;
    dateType: string;
    body: unknown;
  }> = [];

  await page.route("**/api/v1/crm/channel-connections", async (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    const secondConnection = {
      ...createCampaignConnection(),
      displayName: "ZAPI E2E Secundária",
      id: secondCampaignConnectionId,
      isDefault: false,
    };
    await fulfillJson(route, {
      allowance: { limit: 2, remaining: 0, used: 2 },
      availableSetups: [],
      connections: [createCampaignConnection(), secondConnection],
    });
  });

  await page.route(
    /\/api\/v1\/crm\/channel-connections\/([^/]+)\/special-dates(?:\/([^/?]+))?(?:\?.*)?$/,
    async (route) => {
      const match = route
        .request()
        .url()
        .match(/\/channel-connections\/([^/]+)\/special-dates(?:\/([^/?]+))?/);
      const connectionId = match?.[1] ?? "";
      const dateType = match?.[2];
      const configs = configsByConnection.get(connectionId) ?? [];
      if (route.request().method() === "GET" && !dateType) {
        await fulfillJson(route, { configs });
        return;
      }
      if (route.request().method() === "PUT" && dateType) {
        const body = route
          .request()
          .postDataJSON() as Partial<SpecialDateConfig>;
        const current = configs.find(
          (candidate) => candidate.dateType === dateType,
        );
        if (!current) {
          await route.fulfill({ status: 404, body: "not found" });
          return;
        }
        const updated = { ...current, ...body };
        configsByConnection.set(
          connectionId,
          configs.map((candidate) =>
            candidate.dateType === dateType ? updated : candidate,
          ),
        );
        saves.push({ connectionId, dateType, body });
        await fulfillJson(route, { config: updated });
        return;
      }
      await route.fallback();
    },
  );

  return { configsByConnection, saves };
}

export function createE2ePipeline() {
  const statuses = [
    ["new", "Novo Lead", "new", "open"],
    ["contacted", "Contactado", "contacted", "open"],
    ["qualified", "Qualificado", "qualified", "open"],
    ["negotiating", "Negociando", "negotiating", "open"],
    ["won", "Ganho", "won", "won"],
    ["lost", "Perdido", "lost", "lost"],
  ] as const;
  return {
    id: e2ePipelineId,
    name: "Vendas E2E",
    description: "Pipeline de verificação do CRM",
    isDefault: true,
    rotationActive: true,
    stages: statuses.map(([id, name, leadStatus, status]) => ({
      color: "#3b82f6",
      id,
      isSystem: true,
      leadStatus,
      name,
      slaDays: 1,
      status,
    })),
  };
}

export function createBirthDateLead() {
  return {
    assignedUserId: null,
    birthDate: null,
    buyerEmail: "ana.e2e@example.com",
    buyerName: "Ana Nascimento",
    buyerPhone: "5518996469432",
    createdAt: "2026-08-01T12:00:00.000Z",
    id: birthDateLeadId,
    lastInteractionAt: null,
    listingId: null,
    metadata: {},
    pipelineId: e2ePipelineId,
    pipelineStageId: "new",
    source: "manual" as const,
    status: "new" as const,
    storeId: "50000000-0000-4000-8000-000000000001",
    tenantId: "60000000-0000-4000-8000-000000000001",
    updatedAt: "2026-08-01T12:00:00.000Z",
    vehicleTitle: null,
  };
}

export async function installBirthDateApiMocks(page: Page) {
  const lead = createBirthDateLead();
  let currentLead = lead;
  const updates: unknown[] = [];
  const pipeline = createE2ePipeline();

  await page.route("**/api/v1/crm/pipelines", async (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    await fulfillJson(route, { pipelines: [pipeline] });
  });
  await page.route("**/api/v1/crm/leads/board**", async (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    await fulfillJson(route, {
      stages: [
        {
          leads: [currentLead],
          nextCursor: null,
          pipelineStageId: "new",
          total: 1,
        },
      ],
    });
  });
  await page.route(
    new RegExp(`/api/v1/crm/leads/${birthDateLeadId}(?:/activities)?$`),
    async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (route.request().method() === "GET" && path.endsWith("/activities")) {
        await fulfillJson(route, { activities: [] });
        return;
      }
      if (route.request().method() === "GET") {
        await fulfillJson(route, currentLead);
        return;
      }
      if (route.request().method() === "PATCH") {
        const body = route.request().postDataJSON();
        updates.push(body);
        currentLead = {
          ...currentLead,
          ...(body as Partial<typeof currentLead>),
          updatedAt: new Date().toISOString(),
        };
        await fulfillJson(route, currentLead);
        return;
      }
      await route.fallback();
    },
  );

  return { lead, updates };
}

export async function installCampaignCreateCapture(page: Page) {
  let payload: Record<string, unknown> | null = null;
  await page.route("**/api/v1/crm/campaigns", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    payload = route.request().postDataJSON() as Record<string, unknown>;
    await fulfillJson(route, createCampaign());
  });
  return {
    readPayload: () => payload,
  };
}

const tinyPng =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

export function createTinyPngFile() {
  return {
    buffer: Buffer.from(tinyPng, "base64"),
    mimeType: "image/png",
    name: "campanha-e2e.png",
  };
}

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    status: 200,
  });
}
