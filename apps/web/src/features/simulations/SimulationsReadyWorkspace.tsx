import { useState, type ComponentProps } from "react";
import { History, PlusCircle } from "lucide-react";
import { FeatureSection } from "../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../components/ui/FeatureStates";
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
  const [viewingHistorySimulation, setViewingHistorySimulation] =
    useState<CredereSimulation | null>(null);
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
    setViewingHistorySimulation(simulation);
    onSelectSimulation(simulation);
  };

  const handleClearCurrent = () => {
    onSelectSimulation(null as unknown as CredereSimulation);
    setViewingHistorySimulation(null);
    setToast({
      title: "Nova simulação",
      children: "Pronto para preencher uma nova simulação.",
      tone: "info",
    });
  };

  // If viewing a historical simulation or an active submitted simulation, show dedicated full view
  const activeFullResult =
    activeTab === "history" ? (viewingHistorySimulation ?? current) : current;

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

      {/* Tab Navigation Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line/60 pb-4">
        <div
          aria-label="Navegação das simulações"
          className="inline-flex max-w-full items-center gap-1.5 rounded-xl border border-line/60 bg-app-elevated/70 p-1 backdrop-blur-md"
          role="tablist"
        >
          <button
            aria-selected={activeTab === "simulation"}
            className={
              activeTab === "simulation"
                ? "inline-flex items-center gap-2 rounded-lg border border-line/60 bg-panel px-4 py-2 text-xs font-black text-app-text transition-all sm:text-sm"
                : "inline-flex items-center gap-2 rounded-lg border border-transparent px-4 py-2 text-xs font-bold text-muted transition-all hover:bg-panel/40 hover:text-app-text sm:text-sm"
            }
            onClick={() => {
              setActiveTab("simulation");
              setViewingHistorySimulation(null);
            }}
            role="tab"
            type="button"
          >
            <PlusCircle className="size-4 text-accent-strong" />
            <span>Nova simulação</span>
          </button>

          <button
            aria-selected={activeTab === "history"}
            className={
              activeTab === "history"
                ? "inline-flex items-center gap-2 rounded-lg border border-line/60 bg-panel px-4 py-2 text-xs font-black text-app-text transition-all sm:text-sm"
                : "inline-flex items-center gap-2 rounded-lg border border-transparent px-4 py-2 text-xs font-bold text-muted transition-all hover:bg-panel/40 hover:text-app-text sm:text-sm"
            }
            onClick={() => {
              setActiveTab("history");
            }}
            role="tab"
            type="button"
          >
            <History className="size-4 text-accent-strong" />
            <span>Histórico</span>
            {history && history.length > 0 ? (
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-black text-accent-strong">
                {history.length}
              </span>
            ) : null}
          </button>
        </div>

        {activeTab === "simulation" && current ? (
          <button
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-panel px-3.5 py-2 text-xs font-bold text-app-text transition-all hover:border-accent-strong hover:bg-accent-soft hover:text-accent-strong"
            onClick={handleClearCurrent}
            type="button"
          >
            <PlusCircle className="size-3.5" />
            <span>Nova simulação</span>
          </button>
        ) : null}
      </div>

      {activeTab === "history" ? (
        activeFullResult ? (
          <div className="flex flex-col gap-6">
            <SimulationResults
              isPolling={
                isProcessingStatus(activeFullResult.status) &&
                !pollError &&
                !pollExhausted
              }
              isRefreshing={isRefreshing}
              onBack={() => setViewingHistorySimulation(null)}
              onNewSimulation={() => {
                setViewingHistorySimulation(null);
                onSelectSimulation(null as unknown as CredereSimulation);
                setActiveTab("simulation");
              }}
              onRefresh={onRefresh}
              pollError={pollError}
              pollExhausted={pollExhausted}
              simulation={activeFullResult}
            />
          </div>
        ) : (
          <SimulationHistoryPanel
            error={historyError}
            history={history}
            onSelect={handleSelectHistoryItem}
            selectedId={current?.id ?? null}
            variant="full"
          />
        )
      ) : current ? (
        <div className="flex flex-col gap-6">
          <SimulationResults
            isPolling={
              isProcessingStatus(current.status) && !pollError && !pollExhausted
            }
            isRefreshing={isRefreshing}
            onBack={handleClearCurrent}
            onNewSimulation={handleClearCurrent}
            onRefresh={onRefresh}
            pollError={pollError}
            pollExhausted={pollExhausted}
            simulation={current}
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
            {summaryData ? <SimulationSummarySidebar {...summaryData} /> : null}
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
