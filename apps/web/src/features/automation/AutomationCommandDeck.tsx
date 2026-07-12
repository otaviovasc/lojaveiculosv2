import { Bot, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

export function AutomationCommandDeck({ actions }: { actions: ReactNode }) {
  return (
    <section
      aria-labelledby="automation-workspace-title"
      className="automation-command-deck glass-panel-branded"
    >
      <span className="automation-command-deck__mark">
        <Bot aria-hidden="true" />
      </span>
      <div className="automation-command-deck__copy">
        <div className="automation-command-deck__meta">
          <span>IA operacional</span>
          <span>Human-in-the-loop</span>
        </div>
        <div className="automation-command-deck__title-row">
          <h1 id="automation-workspace-title">Central de automações</h1>
          <span className="automation-command-deck__safety">
            <ShieldCheck aria-hidden="true" />
            Preview controlado
          </span>
        </div>
        <p>
          Delegue tarefas, valide cada proposta e preserve a trilha de decisão
          antes de habilitar qualquer executor.
        </p>
      </div>
      <div
        aria-label="Ações da central de automações"
        className="automation-command-deck__actions"
        role="toolbar"
      >
        {actions}
      </div>
    </section>
  );
}
