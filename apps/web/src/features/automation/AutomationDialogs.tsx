import { useEffect, useState } from "react";
import {
  FeatureTextarea,
  FeatureInput,
} from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import {
  FeatureDialog,
  FeatureDialogActions,
} from "../../components/ui/FeatureOverlay";
import type { AutomationRunStep, CreateAutomationRunInput } from "./types";

export function AutomationCreateDialog({
  isOpen,
  isWorking,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  isWorking: boolean;
  onClose: () => void;
  onCreate: (input: CreateAutomationRunInput) => Promise<void>;
}) {
  const [objective, setObjective] = useState("");
  const [module, setModule] = useState("");
  const [resourceId, setResourceId] = useState("");
  const objectiveError =
    objective.trim().length > 0 && objective.trim().length < 8;

  useEffect(() => {
    if (!isOpen) {
      setObjective("");
      setModule("");
      setResourceId("");
    }
  }, [isOpen]);

  const submit = async () => {
    if (objective.trim().length < 8) return;
    const context = {
      ...(module.trim() ? { module: module.trim() } : {}),
      ...(resourceId.trim() ? { resourceId: resourceId.trim() } : {}),
    };
    await onCreate({
      ...(Object.keys(context).length > 0 ? { context } : {}),
      objective: objective.trim(),
    });
    onClose();
  };

  return (
    <FeatureDialog
      footer={
        <FeatureDialogActions
          confirmDisabled={objective.trim().length < 8}
          confirmLabel="Gerar prévia"
          isLoading={isWorking}
          loadingLabel="Preparando"
          onCancel={onClose}
          onConfirm={() => void submit().catch(() => undefined)}
        />
      }
      isOpen={isOpen}
      onClose={onClose}
      title="Nova automação segura"
    >
      <div className="automation-dialog-fields">
        <p>
          Descreva o resultado esperado. Nesta fase o sistema cria somente um
          plano versionado para revisão humana.
        </p>
        <FeatureField
          error={
            objectiveError
              ? "Descreva o objetivo com pelo menos 8 caracteres."
              : undefined
          }
          hint="Não inclua senhas, documentos pessoais ou dados sensíveis."
          label="Objetivo operacional"
        >
          <FeatureTextarea
            autoFocus
            maxLength={2_000}
            onChange={(event) => setObjective(event.target.value)}
            placeholder="Ex.: revisar os veículos sem foto e preparar uma lista de pendências"
            value={objective}
          />
        </FeatureField>
        <div className="automation-dialog-grid">
          <FeatureField hint="Opcional" label="Módulo de contexto">
            <FeatureInput
              maxLength={80}
              onChange={(event) => setModule(event.target.value)}
              placeholder="inventory"
              value={module}
            />
          </FeatureField>
          <FeatureField hint="Opcional" label="ID do recurso">
            <FeatureInput
              maxLength={160}
              onChange={(event) => setResourceId(event.target.value)}
              placeholder="vehicle_..."
              value={resourceId}
            />
          </FeatureField>
        </div>
      </div>
    </FeatureDialog>
  );
}

export function AutomationDecisionDialog({
  decision,
  isWorking,
  onClose,
  onConfirm,
  step,
}: {
  decision: "approve" | "reject" | "cancel" | null;
  isWorking: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  step: AutomationRunStep | null;
}) {
  const isCancel = decision === "cancel";
  const isReject = decision === "reject";
  const title = isCancel
    ? "Cancelar esta prévia?"
    : isReject
      ? "Rejeitar este plano?"
      : "Aprovar este plano?";
  const confirmLabel = isCancel
    ? "Cancelar prévia"
    : isReject
      ? "Rejeitar plano"
      : "Aprovar plano";

  return (
    <FeatureDialog
      footer={
        <FeatureDialogActions
          confirmLabel={confirmLabel}
          isLoading={isWorking}
          loadingLabel="Registrando"
          onCancel={onClose}
          onConfirm={() =>
            void onConfirm()
              .then(onClose)
              .catch(() => undefined)
          }
          variant={isCancel || isReject ? "danger" : "primary"}
        />
      }
      isOpen={decision !== null}
      onClose={onClose}
      title={title}
    >
      <div className="automation-decision-copy">
        <p>
          {isCancel
            ? "A prévia será encerrada e nenhuma etapa poderá ser aprovada depois."
            : isReject
              ? "A decisão será gravada na trilha de auditoria e a proposta não poderá avançar."
              : "A decisão valida a proposta exibida, vinculada à versão e ao digest atuais."}
        </p>
        {step ? (
          <div>
            <span>Proposta revisada</span>
            <strong>{step.title}</strong>
            <p>{step.summary}</p>
          </div>
        ) : null}
        {!isCancel ? (
          <small>
            Mesmo após a aprovação, a execução de ferramentas permanece
            desativada.
          </small>
        ) : null}
      </div>
    </FeatureDialog>
  );
}
