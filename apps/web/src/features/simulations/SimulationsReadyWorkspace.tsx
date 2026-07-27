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
  onSelectSimulation,
  onSubmit,
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
  onSelectSimulation: (simulation: CredereSimulation) => void;
  onSubmit: ComponentProps<typeof SimulationForm>["onSubmit"];
  pollExhausted: boolean;
  prefill?: SimulationPrefill | undefined;
  status: CredereStoreStatus;
  submitError: string | null;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <FeatureSection
        description="Os dados seguem apenas com o consentimento do proponente."
        title="Nova simulação"
      >
        {status.usableBanks.length === 0 ? (
          <FeatureAlert title="Nenhum banco habilitado" tone="warning">
            O provedor não retornou bancos utilizáveis para esta loja no
            momento. Tente novamente mais tarde ou fale com a agência.
          </FeatureAlert>
        ) : (
          <SimulationForm
            banks={status.usableBanks}
            isSubmitting={isSubmitting}
            onSubmit={onSubmit}
            {...(prefill ? { prefill } : {})}
            submitError={submitError}
          />
        )}
      </FeatureSection>
      <div className="grid content-start gap-4">
        {current ? (
          <SimulationResults
            isPolling={isProcessingStatus(current.status) && !pollExhausted}
            isRefreshing={isRefreshing}
            onRefresh={onRefresh}
            simulation={current}
          />
        ) : null}
        <SimulationHistoryPanel
          error={historyError}
          history={history}
          onSelect={onSelectSimulation}
        />
      </div>
    </div>
  );
}
