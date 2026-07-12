import { CircleStop, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { FeatureTabs } from "../../components/ui/FeatureControls";
import {
  FeatureActionButton,
  FeaturePageShell,
} from "../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import { useOptionalAccountSession } from "../account/accountSession";
import { createRuntimeAutomationApi, type AutomationApi } from "./apiClient";
import {
  AutomationCreateDialog,
  AutomationDecisionDialog,
} from "./AutomationDialogs";
import { AutomationCommandDeck } from "./AutomationCommandDeck";
import { AutomationInspector } from "./AutomationInspector";
import {
  readAutomationCapabilities,
  resolveAutomationCapabilities,
} from "./automationPermissions";
import { AutomationRunPreview } from "./AutomationRunPreview";
import { AutomationRunQueue } from "./AutomationRunQueue";
import type { AutomationMobilePane, AutomationPendingDecision } from "./types";
import { useAutomationWorkspace } from "./useAutomationWorkspace";
import { AutomationWorkspaceMetrics } from "./AutomationWorkspaceParts";
import "./automation.css";
import "./automation-command-deck.css";
import "./automation-preview.css";
import "./automation-inspector.css";
import "./automation-responsive.css";

export function AutomationWorkspace({
  api,
  grantedPermissions,
}: {
  api?: AutomationApi;
  grantedPermissions?: readonly string[];
}) {
  const accountSession = useOptionalAccountSession();
  const resolvedApi = useMemo(() => api ?? createRuntimeAutomationApi(), [api]);
  const workspace = useAutomationWorkspace(resolvedApi);
  const capabilities = useMemo(
    () =>
      grantedPermissions === undefined
        ? readAutomationCapabilities(accountSession)
        : resolveAutomationCapabilities(grantedPermissions),
    [accountSession, grantedPermissions],
  );
  const [mobilePane, setMobilePane] = useState<AutomationMobilePane>("preview");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingDecision, setPendingDecision] =
    useState<AutomationPendingDecision>(null);
  const canCancel =
    capabilities.canCancel &&
    workspace.selectedRun?.status === "awaiting_approval";

  const confirmDecision = async () => {
    if (!pendingDecision) return;
    if (pendingDecision.kind === "cancel") {
      if (!capabilities.canCancel) return;
      await workspace.cancelRun();
      return;
    }
    if (!capabilities.canApprove) return;
    await workspace.decide(pendingDecision.step, pendingDecision.kind);
  };

  return (
    <FeaturePageShell
      className="automation-page"
      mainClassName="automation-page__content"
    >
      <AutomationCommandDeck
        actions={
          <>
            {canCancel ? (
              <FeatureActionButton
                disabled={workspace.isWorking}
                icon={CircleStop}
                label="Cancelar prévia"
                onClick={() =>
                  setPendingDecision({ kind: "cancel", step: null })
                }
              />
            ) : null}
            <FeatureActionButton
              disabled={workspace.isWorking}
              icon={RefreshCw}
              isBusy={workspace.isWorking}
              label="Atualizar"
              onClick={() => void workspace.refresh()}
            />
            {capabilities.canRun ? (
              <FeatureActionButton
                icon={Plus}
                label="Nova automação"
                onClick={() => setIsCreateOpen(true)}
                variant="primary"
              />
            ) : null}
          </>
        }
      />

      <AutomationWorkspaceMetrics metrics={workspace.metrics} />

      <FeatureAlert
        className="automation-mode-alert"
        icon={<ShieldCheck aria-hidden="true" className="size-5" />}
        tone="info"
      >
        <div>
          <strong>Modo seguro: execução desativada</strong>
          <p>
            O sistema cria e valida propostas versionadas. Computer use, APIs
            externas e mutações permanecem bloqueados.
          </p>
        </div>
      </FeatureAlert>

      {workspace.error ? (
        <FeatureAlert
          className="automation-error-alert"
          title="A automação precisa da sua atenção"
        >
          <p>{workspace.error}</p>
        </FeatureAlert>
      ) : null}

      <FeatureTabs
        ariaLabel="Área da central de automações"
        className="automation-mobile-tabs"
        onChange={setMobilePane}
        options={[
          { label: "Fila", value: "queue" },
          { label: "Prévia", value: "preview" },
          { label: "Detalhes", value: "details" },
        ]}
        value={mobilePane}
      />

      <div className="automation-workspace-grid">
        <div
          className="automation-workspace-pane"
          data-active={mobilePane === "queue"}
          data-pane="queue"
        >
          <AutomationRunQueue
            hasMore={workspace.hasMore}
            isLoading={workspace.isLoading}
            isLoadingMore={workspace.isLoadingMore}
            onLoadMore={workspace.loadMore}
            onSelect={(runId) => {
              workspace.setSelectedRunId(runId);
              setMobilePane("preview");
            }}
            runs={workspace.runs}
            selectedRunId={workspace.selectedRunId}
            totalCount={workspace.metrics.total}
          />
        </div>
        <div
          className="automation-workspace-pane"
          data-active={mobilePane === "preview"}
          data-pane="preview"
        >
          <AutomationRunPreview run={workspace.selectedRun} />
        </div>
        <div
          className="automation-workspace-pane"
          data-active={mobilePane === "details"}
          data-pane="details"
        >
          <AutomationInspector
            canApprove={capabilities.canApprove}
            isWorking={workspace.isWorking}
            onDecision={(step, kind) => setPendingDecision({ kind, step })}
            run={workspace.selectedRun}
          />
        </div>
      </div>

      {capabilities.canRun ? (
        <AutomationCreateDialog
          isOpen={isCreateOpen}
          isWorking={workspace.isWorking}
          onClose={() => setIsCreateOpen(false)}
          onCreate={workspace.createRun}
        />
      ) : null}
      {capabilities.canApprove || capabilities.canCancel ? (
        <AutomationDecisionDialog
          decision={pendingDecision?.kind ?? null}
          isWorking={workspace.isWorking}
          onClose={() => setPendingDecision(null)}
          onConfirm={confirmDecision}
          step={pendingDecision?.step ?? null}
        />
      ) : null}
    </FeaturePageShell>
  );
}
