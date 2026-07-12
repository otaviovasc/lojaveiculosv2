import { Bot, CheckCircle2, Eye, LockKeyhole, MonitorUp } from "lucide-react";
import { FeaturePreviewPanel } from "../../components/ui/FeatureCards";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";
import {
  automationStatusLabel,
  automationStatusTone,
  formatAutomationDate,
} from "./automationModel";
import type { AutomationRun } from "./types";

export function AutomationRunPreview({ run }: { run: AutomationRun | null }) {
  return (
    <FeaturePreviewPanel
      className="automation-preview-panel"
      frameClassName="automation-preview-frame"
      title={
        <span className="automation-preview-title">
          <span>
            <Eye aria-hidden="true" className="size-4" />
            Prévia segura
          </span>
          <span className="automation-live-indicator">Snapshot</span>
        </span>
      }
    >
      {!run ? (
        <div className="automation-preview-empty">
          <MonitorUp aria-hidden="true" className="size-8" />
          <strong>Selecione ou crie uma automação</strong>
          <p>O plano, seus limites e as evidências aparecerão aqui.</p>
        </div>
      ) : (
        <div className="automation-browser">
          <div className="automation-browser-bar">
            <span className="automation-browser-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="automation-trusted-origin">
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              ambiente isolado ainda não provisionado
            </span>
            <FeatureStatusBadge tone={automationStatusTone(run.status)}>
              {automationStatusLabel(run.status)}
            </FeatureStatusBadge>
          </div>

          <section
            className="automation-preview-canvas"
            aria-label="Plano da automação"
          >
            <div className="automation-preview-hero">
              <span className="automation-bot-mark">
                <Bot aria-hidden="true" className="size-6" />
              </span>
              <div>
                <span>Objetivo solicitado</span>
                <h2>{run.objective}</h2>
                <p>
                  Esta é uma prévia determinística. Nenhum navegador, API
                  externa ou mutação foi executado.
                </p>
              </div>
            </div>

            <ol className="automation-step-timeline">
              {run.steps.map((step) => (
                <li key={step.id}>
                  <span className="automation-step-index">{step.position}</span>
                  <div>
                    <span className="automation-step-label">
                      <CheckCircle2 aria-hidden="true" className="size-3.5" />
                      Leitura de baixo risco
                    </span>
                    <strong>{step.title}</strong>
                    <p>{step.summary}</p>
                  </div>
                </li>
              ))}
            </ol>

            <footer className="automation-preview-footer">
              <span>Run v{run.version}</span>
              <time dateTime={run.updatedAt}>
                Atualizado {formatAutomationDate(run.updatedAt)}
              </time>
              <span>Execução: bloqueada</span>
            </footer>
          </section>
        </div>
      )}
    </FeaturePreviewPanel>
  );
}
