import {
  expect,
  type APIRequestContext,
  type Locator,
  type Page,
} from "@playwright/test";
import { accountHeaders, qaPersonas } from "./support/personas";

type RuleEvent =
  "vehicle_sale_closed" | "financing_approved" | "insurance_issued";

type RuleTiming =
  | { kind: "same_day" }
  | { days: number; kind: "days_after" }
  | { day: number; kind: "day_of_month" | "next_month_day" };

export type RuleDialogInput = {
  amount?: string;
  category: string;
  event: RuleEvent;
  name: string;
  outputType?: "Comissão" | "Despesa" | "Receita";
  percentage?: string;
  priority?: number;
  timing: RuleTiming;
};

const eventBases: Record<RuleEvent, string> = {
  financing_approved: "Valor financiado",
  insurance_issued: "Prêmio do seguro",
  vehicle_sale_closed: "Valor da venda",
};

const eventLabels: Record<RuleEvent, string> = {
  financing_approved: "Financiamento aprovado",
  insurance_issued: "Seguro emitido",
  vehicle_sale_closed: "Venda concluída",
};

export async function createRuleThroughDialog(
  page: Page,
  input: RuleDialogInput,
) {
  await page.getByRole("tab", { exact: true, name: "Personalizadas" }).click();
  await page.getByRole("button", { name: "Nova regra" }).click();
  const dialog = page.getByRole("dialog", { name: "Nova regra automática" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Nome da regra").fill(input.name);
  await selectOption(
    page,
    dialog,
    "Evento de origem",
    eventLabels[input.event],
  );
  if (input.outputType) {
    await selectOption(page, dialog, "Tipo de lançamento", input.outputType);
  }
  await dialog.getByLabel("Categoria").fill(input.category);
  await dialog.getByLabel("Prioridade").fill(String(input.priority ?? 60));

  if (input.percentage) {
    await selectOption(page, dialog, "Modelo de cálculo", "Percentual");
    await dialog.getByLabel("Percentual (%)").fill(input.percentage);
    await expect(dialog.getByText(eventBases[input.event])).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Base do percentual" }),
    ).toHaveCount(0);
  } else {
    await dialog.getByLabel("Valor fixo (R$)").fill(input.amount ?? "100,00");
  }

  if (input.timing.kind !== "same_day") {
    const timingLabel =
      input.timing.kind === "days_after"
        ? "Dias depois"
        : input.timing.kind === "day_of_month"
          ? "Dia do mês"
          : "Dia do próximo mês";
    await selectOption(page, dialog, "Momento do lançamento", timingLabel);
    const value =
      input.timing.kind === "days_after" ? input.timing.days : input.timing.day;
    await dialog
      .getByLabel(input.timing.kind === "days_after" ? "Quantidade" : "Dia")
      .fill(String(value));
  }

  const response = page.waitForResponse(
    (candidate) =>
      candidate.url().includes("/api/v1/finance/auto-entry-rules") &&
      candidate.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: "Criar regra" }).click();
  expect((await response).status()).toBeLessThan(300);
  await expect(page.getByText("Regra criada.")).toBeVisible();
  return ruleCard(page, input.name);
}

export function ruleCard(page: Page, name: string) {
  return page
    .getByRole("heading", { level: 3, name })
    .locator("xpath=ancestor::section[1]");
}

export async function selectOption(
  page: Page,
  container: Locator,
  label: string,
  option: string,
) {
  await container.getByRole("button", { name: label }).click();
  await page.getByRole("option", { exact: true, name: option }).click();
}

export async function createRuleViaApi(
  request: APIRequestContext,
  name: string,
) {
  const response = await request.post("/api/v1/finance/auto-entry-rules", {
    data: {
      calculation: { amountCents: 25000, kind: "fixed" },
      category: "Comissão QA",
      event: "vehicle_sale_closed",
      metadata: { source: "playwright" },
      name,
      outputType: "commission",
      priority: 50,
      sellerUserId: null,
      status: "active",
      timing: { kind: "same_day" },
    },
    headers: ownerApiHeaders(),
  });
  expect(response.status()).toBeLessThan(300);
}

export async function cleanupRules(
  request: APIRequestContext,
  names: readonly string[],
) {
  const response = await request.get("/api/v1/finance/auto-entry-rules", {
    headers: ownerApiHeaders(),
  });
  if (!response.ok()) return;
  const payload = (await response.json()) as {
    rules: Array<{ id: string; name: string | null }>;
  };
  const targets = new Set(names);
  for (const rule of payload.rules) {
    if (!rule.name || !targets.has(rule.name)) continue;
    await request.delete(
      `/api/v1/finance/auto-entry-rules/${encodeURIComponent(rule.id)}`,
      { headers: ownerApiHeaders() },
    );
  }
}

function ownerApiHeaders() {
  return {
    ...accountHeaders(qaPersonas.owner),
    "content-type": "application/json",
    "x-store-slug": qaPersonas.owner.storeSlug,
  };
}
