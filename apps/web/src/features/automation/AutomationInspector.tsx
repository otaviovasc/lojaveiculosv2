import {
  ClipboardCheck,
  Fingerprint,
  ListChecks,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import { FeatureTabs } from "../../components/ui/FeatureControls";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";
import {
  automationStatusLabel,
  automationStatusTone,
  formatAutomationDate,
  shortDigest,
} from "./automationModel";
import type { AutomationRun, AutomationRunStep } from "./types";

type InspectorTab = "plan" | "validation" | "audit";

export function AutomationInspector({
  canApprove,
  isWorking,
  onDecision,
  run,
}: {
  canApprove: boolean;
  isWorking: boolean;
  onDecision: (step: AutomationRunStep, decision: "approve" | "reject") => void;
  run: AutomationRun | null;
}) {
  const [tab, setTab] = useState<InspectorTab>("plan");

  return (
    <section
      className="automation-inspector"
      aria-label="Detalhes da automação"
    >
      <header className="automation-panel-heading">
        <div>
          <span>Inspector</span>
          <h2>Controle e validação</h2>
        </div>
        <ShieldCheck aria-hidden="true" className="size-5 text-accent" />
      </header>

      <FeatureTabs
        ariaLabel="Seções da automação"
        className="automation-inspector-tabs"
        onChange={setTab}
        options={[
          { icon: ListChecks, label: "Plano", value: "plan" },
          { icon: ClipboardCheck, label: "Validar", value: "validation" },
          { icon: Fingerprint, label: "Auditoria", value: "audit" },
        ]}
        value={tab}
      />

      {!run ? (
        <div className="automation-inspector-empty">
          <p>
            Selecione uma prévia para inspecionar versões, validações e
            decisões.
          </p>
        </div>
      ) : tab === "plan" ? (
        <PlanTab run={run} />
      ) : tab === "validation" ? (
        <ValidationTab
          canApprove={canApprove}
          isWorking={isWorking}
          onDecision={onDecision}
          run={run}
        />
      ) : (
        <AuditTab run={run} />
      )}
    </section>
  );
}

function PlanTab({ run }: { run: AutomationRun }) {
  return (
    <div className="automation-inspector-body">
      <div className="automation-inspector-status">
        <FeatureStatusBadge tone={automationStatusTone(run.status)}>
          {automationStatusLabel(run.status)}
        </FeatureStatusBadge>
        <span>
          {run.steps.length} etapa{run.steps.length === 1 ? "" : "s"}
        </span>
      </div>
      {run.steps.map((step) => (
        <article className="automation-inspector-card" key={step.id}>
          <span>Etapa {step.position}</span>
          <strong>{step.title}</strong>
          <p>{step.summary}</p>
          <small>Risco baixo · somente prévia</small>
        </article>
      ))}
    </div>
  );
}

function ValidationTab({
  canApprove,
  isWorking,
  onDecision,
  run,
}: {
  canApprove: boolean;
  isWorking: boolean;
  onDecision: (step: AutomationRunStep, decision: "approve" | "reject") => void;
  run: AutomationRun;
}) {
  const pending = run.steps.filter(
    (step) => step.approval?.status === "pending",
  );
  return (
    <div className="automation-inspector-body">
      <div className="automation-safety-note">
        <ShieldCheck aria-hidden="true" className="size-5" />
        <p>
          Aprovar registra sua decisão sobre o plano. A execução continua
          desativada.
        </p>
      </div>
      {pending.length === 0 ? (
        <p className="automation-inspector-empty">
          Não há validações pendentes nesta prévia.
        </p>
      ) : (
        pending.map((step) => (
          <article className="automation-approval-card" key={step.id}>
            <span>Revisão humana obrigatória</span>
            <strong>{step.title}</strong>
            <p>{step.summary}</p>
            <code>{shortDigest(step.approval?.proposalDigest ?? "")}</code>
            {canApprove ? (
              <div className="automation-approval-actions">
                <FeatureActionButton
                  disabled={isWorking}
                  label="Rejeitar plano"
                  onClick={() => onDecision(step, "reject")}
                />
                <FeatureActionButton
                  disabled={isWorking}
                  label="Aprovar plano"
                  onClick={() => onDecision(step, "approve")}
                  variant="primary"
                />
              </div>
            ) : (
              <p className="automation-permission-note">
                Seu perfil pode revisar esta proposta, mas não registrar a
                decisão.
              </p>
            )}
          </article>
        ))
      )}
    </div>
  );
}

function AuditTab({ run }: { run: AutomationRun }) {
  return (
    <dl className="automation-audit-list">
      <div>
        <dt>Run</dt>
        <dd>{run.id}</dd>
      </div>
      <div>
        <dt>Versão</dt>
        <dd>{run.version}</dd>
      </div>
      <div>
        <dt>Criado por</dt>
        <dd>{run.createdByActorId}</dd>
      </div>
      <div>
        <dt>Criado em</dt>
        <dd>{formatAutomationDate(run.createdAt)}</dd>
      </div>
      <div>
        <dt>Execução</dt>
        <dd>Desativada por contrato</dd>
      </div>
      {run.steps.map((step) => (
        <div key={step.id}>
          <dt>Digest etapa {step.position}</dt>
          <dd>
            {shortDigest(step.approval?.proposalDigest ?? "não aplicável")}
          </dd>
        </div>
      ))}
    </dl>
  );
}
