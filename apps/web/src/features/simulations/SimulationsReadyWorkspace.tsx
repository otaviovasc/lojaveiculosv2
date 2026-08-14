import { useState, type ComponentProps } from "react";
import { History, Landmark, PlusCircle } from "lucide-react";
import { FeatureSection } from "../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import { FeatureTabs } from "../../components/ui/FeatureTabs";
import { Toast, type ToastTone } from "../../components/ui/Toast";
import { SimulationForm, type SimulationPrefill } from "./SimulationForm";
import type { SimulationSummaryData } from "./SimulationForm.types";
import { SimulationHistoryPanel } from "./SimulationHistoryPanel";
import { isProcessingStatus, SimulationResults } from "./SimulationResults";
import { SimulationSummarySidebar } from "./SimulationSummarySidebar";
import type { CredereSimulation, CredereStoreStatus } from "./types";

export function SimulationsReadyWorkspace({
  current,
  history,
  historyError,
  isRefreshing,
  isSubmitting,
  onRefresh,
  onGetRequiredFields,
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
  onGetRequiredFields: ComponentProps<
    typeof SimulationForm
  >["onGetRequiredFields"];
  onResolveFipe: ComponentProps<typeof SimulationForm>["onResolveFipe"];
  onSelectSimulation: (simulation: CredereSimulation) => void;
  onSubmit: ComponentProps<typeof SimulationForm>["onSubmit"];
  pollError: string | null;
  pollExhausted: boolean;
  prefill?: SimulationPrefill | undefined;
  status: CredereStoreStatus;
  submitError: string | null;
}) {
  const [activeTab, setActiveTab] = useState<"simulation" | "history">(
    "simulation",
  );
  const [summaryData, setSummaryData] = useState<SimulationSummaryData | null>(
    null,
  );
  const [toast, setToast] = useState<{
    title: string;
    children?: string;
    tone: ToastTone;
  } | null>(null);

  const formKey = prefill ? createPrefillIdentity(prefill) : "manual";

  const handleSelectHistoryItem = (simulation: CredereSimulation) => {
    onSelectSimulation(simulation);
    setActiveTab("simulation");
  };

  return (
    <FeatureSection
      className="credere-workspace credere-shell-workspace-enter grid gap-6"
      padding="none"
    >
      {toast ? (
        <Toast
          durationMs={4000}
          onDismiss={() => setToast(null)}
          title={toast.title}
          tone={toast.tone}
        >
          {toast.children}
        </Toast>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line/40 pb-4">
        <FeatureTabs
          ariaLabel="Navegação das simulações"
          className="w-full min-w-0 flex-1"
          onChange={setActiveTab}
          optionClassName="flex-1 justify-center"
          options={[
            {
              icon: PlusCircle,
              label: "Nova simulação",
              value: "simulation",
            },
            {
              icon: History,
              label: history ? `Histórico (${history.length})` : "Histórico",
              value: "history",
            },
          ]}
          value={activeTab}
          variant="panel"
        />

        {current && activeTab === "simulation" ? (
          <button
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-panel px-3 py-1.5 text-xs font-bold text-app-text transition-colors hover:border-accent-strong hover:bg-accent-soft hover:text-accent-strong"
            onClick={() => {
              onSelectSimulation(null as unknown as CredereSimulation);
              setToast({
                title: "Formulário reiniciado",
                children: "Pronto para preencher uma nova simulação.",
                tone: "info",
              });
            }}
            type="button"
          >
            <Landmark className="size-3.5" />
            <span>Limpar resultado atual</span>
          </button>
        ) : null}
      </div>

      {activeTab === "history" ? (
        <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm">
          <SimulationHistoryPanel
            error={historyError}
            history={history}
            onSelect={handleSelectHistoryItem}
            selectedId={current?.id ?? null}
            variant="full"
          />
        </div>
      ) : (
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
                  onGetRequiredFields={onGetRequiredFields}
                  onResolveFipe={onResolveFipe}
                  onSubmit={async (draft) => {
                    await onSubmit(draft);
                    setToast({
                      title: "Simulação enviada!",
                      children: "Consulta transmitida à Credere com sucesso.",
                      tone: "success",
                    });
                  }}
                  onSummaryChange={setSummaryData}
                  onToast={(message) =>
                    setToast({ title: message, tone: "info" })
                  }
                  {...(prefill ? { prefill } : {})}
                  submitError={submitError}
                />
              )}
            </div>
          </section>

          <aside
            aria-label="Resumo e retorno da simulação"
            className="credere-response-pane"
          >
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
            ) : summaryData ? (
              <SimulationSummarySidebar {...summaryData} />
            ) : null}
          </aside>
        </div>
      )}
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
