import type { AutomationRunContext } from "./models.js";

export type AutomationPreviewProposal = {
  digest: string;
  summary: string;
  title: string;
};

export async function buildAutomationPreviewProposal(input: {
  context: AutomationRunContext;
  objective: string;
}): Promise<AutomationPreviewProposal> {
  const title = "Revisar plano somente leitura";
  const summary =
    `Preparar uma análise somente leitura para: ${input.objective}. ` +
    "Nenhuma ferramenta ou alteração será executada nesta versão.";
  const canonical = JSON.stringify({
    context: input.context,
    executionEnabled: false,
    kind: "read_only_preview",
    objective: input.objective,
    risk: "low",
    summary,
    title,
  });

  return { digest: await sha256(canonical), summary, title };
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
