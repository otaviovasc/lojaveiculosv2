import { expect, test, type Page } from "@playwright/test";
import { installCampaignApiMocks } from "./crm-whatsapp-campaigns-helpers";
import { createCampaignSessions } from "./crm-whatsapp-campaigns-fixtures";
import { installLocalOwnerSession } from "./crm-whatsapp-test-helpers";
import { setQaViewport, type QaViewport } from "./support/viewports";

const activeCycleId = "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61";

for (const viewport of ["desktop", "mobile"] satisfies QaViewport[]) {
  test(`keeps the CRM composer resilient on ${viewport}`, async ({ page }) => {
    await setQaViewport(page, viewport);
    await installLocalOwnerSession(page);
    await installControllableEventSource(page);
    await installCampaignApiMocks(page);
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

    await composer.fill("Segunda mensagem na fila");
    await page.getByRole("button", { name: "Enviar mensagem" }).click();
    await expect(composer).toBeEnabled();
    await expect(composer).toBeFocused();
    await expect.poll(() => sends.requestBodies).toHaveLength(1);
    await expectOptimisticOrder(page);

    sends.releaseFirst();
    await expect
      .poll(() => sends.requestBodies)
      .toEqual(["Primeira mensagem em espera", "Segunda mensagem na fila"]);
    const toast = page.getByRole("alert").filter({
      has: page.getByRole("button", { name: "Fechar notificação" }),
    });
    await expect(toast).toBeVisible();

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

    const sourceCountBeforeFailure = await page.evaluate(() => {
      const state = window as typeof window & {
        __crmRealtimeE2e?: {
          failLatest: () => void;
          sourceCount: () => number;
        };
      };
      const sourceCount = state.__crmRealtimeE2e?.sourceCount() ?? 0;
      state.__crmRealtimeE2e?.failLatest();
      return sourceCount;
    });
    if (viewport === "desktop") {
      await expect(
        page.getByRole("status").filter({ hasText: "Reconectando" }),
      ).toHaveText("Reconectando");
    } else {
      await expect
        .poll(() =>
          page.evaluate(() => {
            const state = window as typeof window & {
              __crmRealtimeE2e?: { sourceCount: () => number };
            };
            return state.__crmRealtimeE2e?.sourceCount() ?? 0;
          }),
        )
        .toBeGreaterThan(sourceCountBeforeFailure);
    }
    await expect(composer).toBeEnabled();

    const closeToast = toast.getByRole("button", {
      name: "Fechar notificação",
    });
    await closeToast.focus();
    await page.keyboard.press("Enter");
    await expect(toast).toHaveCount(0);

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

async function installQueuedSendRoute(page: Page) {
  const requestBodies: string[] = [];
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
      requestBodies.push(body.content ?? "");
      if (requestBodies.length === 1) {
        await firstRequestGate;
        await route.fulfill({
          body: JSON.stringify({
            code: "CRM_SEND_TEMPORARILY_UNAVAILABLE",
            message: "Falha controlada do primeiro envio.",
            requestId: "crm-resilience-e2e",
          }),
          headers: { "content-type": "application/json" },
          status: 503,
        });
        return;
      }
      await route.fulfill({
        body: JSON.stringify({
          channel: "whatsapp",
          content: body.content,
          createdAt: "2026-08-27T15:00:00.000Z",
          direction: "OUTBOUND",
          id: "crm-resilience-second-message",
          senderOrigin: "human",
          senderType: "HUMAN",
          status: "SENT",
          type: "TEXT",
        }),
        headers: { "content-type": "application/json" },
        status: 201,
      });
    },
  );

  return {
    releaseFirst: () => releaseFirstRequest(),
    requestBodies,
  };
}

async function installControllableEventSource(page: Page) {
  await page.addInitScript(() => {
    type Listener = (event: Event) => void;
    const sources: ControllableEventSource[] = [];

    class ControllableEventSource {
      onerror: ((event: Event) => void) | null = null;
      onopen: ((event: Event) => void) | null = null;
      readonly url: string;
      private readonly listeners = new Map<string, Set<Listener>>();

      constructor(url: string) {
        this.url = url;
        sources.push(this);
        setTimeout(() => this.onopen?.(new Event("open")), 0);
      }

      addEventListener(name: string, listener: Listener) {
        const listeners = this.listeners.get(name) ?? new Set<Listener>();
        listeners.add(listener);
        this.listeners.set(name, listeners);
      }

      close() {}

      fail() {
        this.onerror?.(new Event("error"));
      }
    }

    const state = window as typeof window & {
      __crmRealtimeE2e?: {
        failLatest: () => void;
        sourceCount: () => number;
      };
    };
    state.__crmRealtimeE2e = {
      failLatest: () => sources.at(-1)?.fail(),
      sourceCount: () => sources.length,
    };
    window.EventSource =
      ControllableEventSource as unknown as typeof EventSource;
  });
}
