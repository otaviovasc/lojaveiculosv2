import { expect, test, type Page } from "@playwright/test";
import { installCampaignApiMocks } from "./crm-whatsapp-campaigns-helpers";
import {
  campaignConnectionId,
  createCampaignSessions,
} from "./crm-whatsapp-campaigns-fixtures";
import { installLocalOwnerSession } from "./crm-whatsapp-test-helpers";
import { setQaViewport, type QaViewport } from "./support/viewports";

const activeCycleId = "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61";

for (const viewport of ["desktop", "mobile"] satisfies QaViewport[]) {
  test(`keeps the CRM composer resilient on ${viewport}`, async ({ page }) => {
    await setQaViewport(page, viewport);
    await installLocalOwnerSession(page);
    await installControllableRealtimeStream(page);
    await installCampaignApiMocks(page);
    const realtimeTickets = await installRealtimeTicketRoute(page);
    await installFilterAwareConversationRoute(page);
    const sends = await installQueuedSendRoute(page);

    await page.goto("/crm#/crm?surface=conversations");
    await page
      .getByRole("group", { name: "Filtros rápidos" })
      .getByRole("button", { name: /Todos/ })
      .click();
    await page
      .getByRole("button", { name: /Ana Premium/ })
      .first()
      .click();

    const composer = page.getByPlaceholder("Digite uma mensagem...");
    await expect(composer).toBeFocused();

    await composer.fill("Primeira mensagem em espera");
    await page.getByRole("button", { name: "Enviar mensagem" }).click();
    await expect(composer).toBeEnabled();
    await expect(composer).toBeFocused();
    await expect
      .poll(() => sends.requestBodies)
      .toEqual(["Primeira mensagem em espera"]);

    const realtimeRequest = await readLatestRealtimeRequest(page);
    expect(realtimeRequest).toEqual({
      hasActorAuth: true,
      ticket: "crm-resilience-ticket-1",
    });

    const firstRequest = sends.requests[0];
    expect(firstRequest).toBeDefined();
    await emitRealtimeEvent(page, "message_status", {
      connectionId: campaignConnectionId,
      cycleId: activeCycleId,
      messageId: firstRequest!.serverMessageId,
      status: "DELIVERED",
      type: "message_status",
    });
    await flushBrowserFrame(page);
    await emitRealtimeEvent(
      page,
      "message",
      createMessageRealtimeEvent({
        clientRequestId: firstRequest!.clientRequestId,
        content: firstRequest!.content,
        messageId: firstRequest!.serverMessageId,
        status: "SENT",
      }),
    );
    await expectMessageCount(page, "Primeira mensagem em espera", 1);
    await expectMessageDelivery(
      page,
      firstRequest!.serverMessageId,
      "delivered",
    );

    const sourceCountBeforeFailure = await failLatestRealtimeStream(page);
    if (viewport === "desktop") {
      await expect(
        page.getByRole("status", { name: /reconectando/i }),
      ).toBeVisible();
    }
    await expect(composer).toBeEnabled();

    await composer.fill("Segunda mensagem na fila");
    await page.getByRole("button", { name: "Enviar mensagem" }).click();
    await expect(composer).toBeEnabled();
    await expect(composer).toBeFocused();
    await expect.poll(() => sends.requestBodies).toHaveLength(1);
    await expectOptimisticOrder(page);
    await expect
      .poll(() => realtimeSourceCount(page))
      .toBeGreaterThan(sourceCountBeforeFailure);
    await expect.poll(() => realtimeTickets.issued).toBe(2);
    await expect(await readLatestRealtimeRequest(page)).toEqual({
      hasActorAuth: true,
      ticket: "crm-resilience-ticket-2",
    });
    if (viewport === "desktop") {
      await expect(
        page.getByRole("status", { name: /tempo real: sincronizado/i }),
      ).toBeVisible();
    }

    sends.releaseFirst();
    await expect
      .poll(() => sends.requestBodies)
      .toEqual(["Primeira mensagem em espera", "Segunda mensagem na fila"]);
    await expectMessageCount(page, "Primeira mensagem em espera", 1);
    await expectMessageDelivery(
      page,
      firstRequest!.serverMessageId,
      "delivered",
    );

    const secondRequest = sends.requests[1];
    expect(secondRequest).toBeDefined();
    await expectMessageDelivery(page, secondRequest!.serverMessageId, "sent");
    await emitRealtimeEvent(page, "message_status", {
      connectionId: campaignConnectionId,
      cycleId: activeCycleId,
      lastCustomerReadAt: "2026-08-27T15:00:03.000Z",
      messageId: secondRequest!.serverMessageId,
      status: "READ",
      type: "message_status",
    });
    await expectMessageDelivery(page, secondRequest!.serverMessageId, "read");
    await expectMessageCount(page, "Segunda mensagem na fila", 1);

    if (viewport === "mobile") {
      await page.keyboard.press("Alt+1");
    }
    await page
      .getByRole("group", { name: "Filtros rápidos" })
      .getByRole("button", { name: /Meus/ })
      .click();
    if (viewport === "mobile") await page.keyboard.press("Alt+2");
    await expect(page.getByLabel("Detalhe da conversa")).toContainText(
      "Ana Premium",
    );

    await page.getByRole("button", { name: "Prompt IA" }).click();
    const prompt = page.getByRole("dialog", { name: "Prompt IA" });
    await expect(prompt).toBeVisible();
    await expect(composer).not.toBeFocused();
    await prompt
      .getByRole("button", { name: "Sugerir resposta acolhedora" })
      .click();
    await expect(composer).toHaveValue(/obrigado pelo contato/);

    await page
      .getByRole("button", { name: "Pesquisar nesta conversa" })
      .click();
    const messageSearch = page.getByPlaceholder("Pesquisar nesta conversa");
    await expect(messageSearch).toBeFocused();
    await messageSearch.fill("interesse");
    await expect(messageSearch).toBeFocused();
    await page.getByRole("button", { name: "Próximo" }).click();
    await expect(page.locator("#crm-msg-msg-1")).toHaveClass(
      /crm-message-highlight/,
    );
    await page.getByRole("button", { name: "Fechar pesquisa" }).click();

    await page
      .getByRole("button", { name: "Abrir detalhes da conversa" })
      .click();
    const details = page.getByRole("complementary", {
      exact: true,
      name: "Detalhes da conversa",
    });
    await expect(details).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(details).toHaveCount(0);
  });
}

async function expectOptimisticOrder(page: Page) {
  const first = page
    .getByLabel("Detalhe da conversa")
    .getByText("Primeira mensagem em espera");
  const second = page
    .getByLabel("Detalhe da conversa")
    .getByText("Segunda mensagem na fila");
  await expect(first).toBeVisible();
  await expect(second).toBeVisible();
  const [firstBox, secondBox] = await Promise.all([
    first.boundingBox(),
    second.boundingBox(),
  ]);
  expect(firstBox).not.toBeNull();
  expect(secondBox).not.toBeNull();
  expect(firstBox!.y).toBeLessThan(secondBox!.y);
}

async function expectMessageCount(page: Page, content: string, count: number) {
  await expect(
    page.getByLabel("Detalhe da conversa").getByText(content, { exact: true }),
  ).toHaveCount(count);
}

async function expectMessageDelivery(
  page: Page,
  messageId: string,
  status: "delivered" | "read" | "sent",
) {
  const message = page.locator(`[data-message-id="${messageId}"]`);
  await expect(message).toHaveAttribute("data-message-status", status);
  await expect(
    message.getByLabel(
      status === "read"
        ? "Mensagem lida"
        : status === "delivered"
          ? "Mensagem entregue"
          : "Mensagem enviada",
    ),
  ).toBeVisible();
}

async function installFilterAwareConversationRoute(page: Page) {
  const conversationCycles = createCampaignSessions().map(
    ({ uuid: _legacyFixtureId, ...cycle }) => cycle,
  );
  await page.route(/\/api\/v1\/crm\/conversation-cycles(?:\?.*)?$/, (route) => {
    const filter = new URL(route.request().url()).searchParams.get("filter");
    return route.fulfill({
      body: JSON.stringify(filter === "mine" ? [] : conversationCycles),
      headers: { "content-type": "application/json" },
      status: 200,
    });
  });
}

async function installRealtimeTicketRoute(page: Page) {
  const state = { issued: 0 };
  await page.route("**/api/v1/crm/events/ticket", async (route) => {
    state.issued += 1;
    await route.fulfill({
      body: JSON.stringify({ ticket: `crm-resilience-ticket-${state.issued}` }),
      headers: { "content-type": "application/json" },
      status: 200,
    });
  });
  return state;
}

async function installQueuedSendRoute(page: Page) {
  const requestBodies: string[] = [];
  const requests: Array<{
    clientRequestId: string;
    content: string;
    serverMessageId: string;
  }> = [];
  let releaseFirstRequest = () => undefined;
  const firstRequestGate = new Promise<void>((resolve) => {
    releaseFirstRequest = resolve;
  });

  await page.route(
    new RegExp(
      `/api/v1/crm/conversation-cycles/${activeCycleId}/messages(?:\\?.*)?$`,
    ),
    async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      const body = route.request().postDataJSON() as { content?: string };
      const content = body.content ?? "";
      const sequence = requestBodies.length + 1;
      const request = {
        clientRequestId:
          route.request().headers()["idempotency-key"] ?? `missing-${sequence}`,
        content,
        serverMessageId: `crm-resilience-message-${sequence}`,
      };
      requestBodies.push(content);
      requests.push(request);
      if (requestBodies.length === 1) {
        await firstRequestGate;
      }
      await route.fulfill({
        body: JSON.stringify(
          createServerMessage({
            clientRequestId: request.clientRequestId,
            content,
            messageId: request.serverMessageId,
            status: "SENT",
          }),
        ),
        headers: { "content-type": "application/json" },
        status: 201,
      });
    },
  );

  return {
    releaseFirst: () => releaseFirstRequest(),
    requestBodies,
    requests,
  };
}

function createServerMessage(input: {
  clientRequestId: string;
  content: string;
  messageId: string;
  status: "SENT" | "DELIVERED" | "READ";
}) {
  return {
    channel: "whatsapp",
    clientRequestId: input.clientRequestId,
    content: input.content,
    createdAt: "2026-08-27T15:00:00.000Z",
    direction: "OUTBOUND",
    id: input.messageId,
    senderOrigin: "human_crm",
    senderType: "HUMAN",
    senderUser: {
      id: "70000000-0000-4000-8000-000000000001",
      name: "Seed Owner",
    },
    status: input.status,
    type: "TEXT",
  };
}

function createMessageRealtimeEvent(input: {
  clientRequestId: string;
  content: string;
  messageId: string;
  status: "SENT" | "DELIVERED" | "READ";
}) {
  const cycle = createCampaignSessions()[0];
  if (!cycle) throw new Error("Missing CRM resilience cycle fixture.");
  const { uuid: _legacyFixtureId, ...conversationCycle } = cycle;
  return {
    connectionId: campaignConnectionId,
    conversationCycle: {
      ...conversationCycle,
      lastMessageAt: "2026-08-27T15:00:00.000Z",
      lastMessageContent: input.content,
      revision: 2,
    },
    message: createServerMessage(input),
    type: "message",
  };
}

async function installControllableRealtimeStream(page: Page) {
  await page.addInitScript(() => {
    const nativeFetch = window.fetch.bind(window);
    const encoder = new TextEncoder();
    const streams: Array<{
      controller: ReadableStreamDefaultController<Uint8Array>;
      open: boolean;
    }> = [];
    const requests: Array<{ hasActorAuth: boolean; ticket: string | null }> =
      [];

    const state = window as typeof window & {
      __crmRealtimeE2e?: {
        emit: (event: string, payload: unknown, id: string) => void;
        failLatest: () => void;
        latestRequest: () => {
          hasActorAuth: boolean;
          ticket: string | null;
        } | null;
        sourceCount: () => number;
      };
    };
    state.__crmRealtimeE2e = {
      emit: (event, payload, id) => {
        const latest = streams.at(-1);
        if (!latest?.open) throw new Error("CRM SSE stream is not open.");
        latest.controller.enqueue(
          encoder.encode(
            `id: ${id}\nevent: ${event}\ndata: ${JSON.stringify(payload)}\n\n`,
          ),
        );
      },
      failLatest: () => {
        const latest = streams.at(-1);
        if (!latest?.open) return;
        latest.open = false;
        latest.controller.error(new Error("Controlled CRM SSE interruption."));
      },
      latestRequest: () => requests.at(-1) ?? null,
      sourceCount: () => streams.length,
    };

    window.fetch = async (input, init) => {
      const rawUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      const url = new URL(rawUrl, window.location.href);
      const method = (
        init?.method ?? (input instanceof Request ? input.method : "GET")
      ).toUpperCase();
      if (method !== "GET" || url.pathname !== "/api/v1/crm/events") {
        return nativeFetch(input, init);
      }

      const headers = new Headers(
        init?.headers ?? (input instanceof Request ? input.headers : undefined),
      );
      requests.push({
        hasActorAuth:
          headers.has("Authorization") || headers.has("x-clerk-user-id"),
        ticket: headers.get("X-CRM-SSE-Ticket"),
      });

      let source: (typeof streams)[number] | null = null;
      const stream = new ReadableStream<Uint8Array>({
        cancel() {
          if (source) source.open = false;
        },
        start(controller) {
          source = { controller, open: true };
          const activeSource = source;
          streams.push(activeSource);
          init?.signal?.addEventListener(
            "abort",
            () => {
              if (!activeSource.open) return;
              activeSource.open = false;
              controller.error(new DOMException("Aborted", "AbortError"));
            },
            { once: true },
          );
        },
      });
      return new Response(stream, {
        headers: { "content-type": "text/event-stream" },
        status: 200,
      });
    };
  });
}

async function emitRealtimeEvent(page: Page, event: string, payload: unknown) {
  await page.evaluate(
    ({ eventName, eventPayload, id }) => {
      const state = window as typeof window & {
        __crmRealtimeE2e?: {
          emit: (event: string, payload: unknown, id: string) => void;
        };
      };
      state.__crmRealtimeE2e?.emit(eventName, eventPayload, id);
    },
    {
      eventName: event,
      eventPayload: payload,
      id: `crm-resilience-event-${crypto.randomUUID()}`,
    },
  );
}

async function flushBrowserFrame(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
  );
}

async function failLatestRealtimeStream(page: Page) {
  return page.evaluate(() => {
    const state = window as typeof window & {
      __crmRealtimeE2e?: {
        failLatest: () => void;
        sourceCount: () => number;
      };
    };
    const count = state.__crmRealtimeE2e?.sourceCount() ?? 0;
    state.__crmRealtimeE2e?.failLatest();
    return count;
  });
}

async function realtimeSourceCount(page: Page) {
  return page.evaluate(() => {
    const state = window as typeof window & {
      __crmRealtimeE2e?: { sourceCount: () => number };
    };
    return state.__crmRealtimeE2e?.sourceCount() ?? 0;
  });
}

async function readLatestRealtimeRequest(page: Page) {
  return expect
    .poll(() =>
      page.evaluate(() => {
        const state = window as typeof window & {
          __crmRealtimeE2e?: {
            latestRequest: () => {
              hasActorAuth: boolean;
              ticket: string | null;
            } | null;
          };
        };
        return state.__crmRealtimeE2e?.latestRequest() ?? null;
      }),
    )
    .not.toBeNull()
    .then(() =>
      page.evaluate(() => {
        const state = window as typeof window & {
          __crmRealtimeE2e?: {
            latestRequest: () => {
              hasActorAuth: boolean;
              ticket: string | null;
            } | null;
          };
        };
        return state.__crmRealtimeE2e?.latestRequest() ?? null;
      }),
    );
}
