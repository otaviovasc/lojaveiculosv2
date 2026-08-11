import type { ComponentProps } from "react";
import { FeatureSection } from "../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import { SimulationForm, type SimulationPrefill } from "./SimulationForm";
import { SimulationHistoryPanel } from "./SimulationHistoryPanel";
import { isProcessingStatus, SimulationResults } from "./SimulationResults";
import type { CredereSimulation, CredereStoreStatus } from "./types";

export function SimulationsReadyWorkspace({
  current,
  history,
  historyError,
  isRefreshing,
  isSubmitting,
  onRefresh,
  onResolveFipe,
  onSelectSimulation,
  onSubmit,
  pollError,
  pollExhausted,
  prefill,
  status,
  submitError,
}: {
  current: CredereSimulation | null;
  history: CredereSimulation[] | null;
  historyError: string | null;
  isRefreshing: boolean;
  isSubmitting: boolean;
  onRefresh: () => void;
  onResolveFipe: ComponentProps<typeof SimulationForm>["onResolveFipe"];
  onSelectSimulation: (simulation: CredereSimulation) => void;
  onSubmit: ComponentProps<typeof SimulationForm>["onSubmit"];
  pollError: string | null;
  pollExhausted: boolean;
  prefill?: SimulationPrefill | undefined;
  status: CredereStoreStatus;
  submitError: string | null;
}) {
  const formKey = prefill ? createPrefillIdentity(prefill) : "manual";
  return (
    <FeatureSection className="credere-workspace" padding="none">
      <div className="credere-workspace-grid">
        <section
          aria-labelledby="credere-new-simulation-title"
          className="credere-form-pane"
        >
          <header className="credere-pane-header">
            <div>
              <span className="credere-section-label">Consulta oficial</span>
              <h2 id="credere-new-simulation-title">Nova simulação</h2>
              <p>
                Os dados seguem aos bancos somente após o consentimento do
                proponente.
              </p>
            </div>
          </header>
          <div className="credere-form-body">
            {status.usableBanks.length === 0 ? (
              <FeatureAlert title="Nenhum banco habilitado" tone="warning">
                O provedor não retornou bancos utilizáveis para esta loja no
                momento. Tente novamente mais tarde ou fale com a agência.
              </FeatureAlert>
            ) : (
              <SimulationForm
                banks={status.usableBanks}
                isSubmitting={isSubmitting}
                key={formKey}
                onResolveFipe={onResolveFipe}
                onSubmit={onSubmit}
                {...(prefill ? { prefill } : {})}
                submitError={submitError}
              />
            )}
          </div>
        </section>
        <aside className="credere-response-pane">
          {current ? (
            <SimulationResults
              isPolling={
                isProcessingStatus(current.status) &&
                !pollError &&
                !pollExhausted
              }
              isRefreshing={isRefreshing}
              onRefresh={onRefresh}
              pollError={pollError}
              pollExhausted={pollExhausted}
              simulation={current}
            />
          ) : (
            <section className="credere-awaiting-result">
              <span className="credere-section-label">Retorno dos bancos</span>
              <h3>Preencha a consulta ao lado</h3>
              <p>
                O resultado aparecerá aqui sem substituir a análise formal da
                instituição financeira.
              </p>
            </section>
          )}
          <SimulationHistoryPanel
            error={historyError}
            history={history}
            onSelect={onSelectSimulation}
          />
        </aside>
      </div>
    </FeatureSection>
  );
}

export function createPrefillIdentity(prefill: SimulationPrefill) {
  return JSON.stringify(
    Object.keys(prefill)
      .sort()
      .map((key) => [key, prefill[key as keyof SimulationPrefill] ?? null]),
  );
}
