import { useState, type ComponentProps } from "react";
import { History, PlusCircle } from "lucide-react";
import { FeatureSection } from "../../components/ui/FeatureLayout";
import { FeatureTabs } from "../../components/ui/FeatureTabs";
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
  onRetryHistory,
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
  onRetryHistory: () => void;
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

      {/* Tab Navigation Selector - Full Width */}
      <div className="w-full">
        <FeatureTabs
          activeClassName="border-line/60 bg-panel font-black text-app-text"
          ariaLabel="Navegação das simulações"
          onChange={(value) => {
            setActiveTab(value);
            if (value === "simulation") setViewingHistorySimulation(null);
          }}
          optionClassName="inline-flex items-center justify-center gap-2 rounded-xl border border-transparent px-4 py-2.5 text-xs font-bold text-muted transition-all hover:bg-panel/40 hover:text-app-text sm:text-sm"
          options={[
            {
              icon: PlusCircle,
              label: "Nova simulação",
              value: "simulation",
            },
            {
              icon: History,
              label:
                history && history.length > 0
                  ? `Histórico (${history.length})`
                  : "Histórico",
              value: "history",
            },
          ]}
          value={activeTab}
          variant="split"
        />
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
              onBack={() => {
                setViewingHistorySimulation(null);
                onSelectSimulation(null as unknown as CredereSimulation);
              }}
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
            onRetry={onRetryHistory}
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
              {status.unavailableBanks.length > 0 ? (
                <FeatureAlert
                  title={`${status.unavailableBanks.length} banco(s) indisponível(is)`}
                  tone="warning"
                >
                  {unavailableBankCopy(status)}
                </FeatureAlert>
              ) : null}
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
                      title: "Simulação registrada",
                      children:
                        "A consulta foi aceita e o status será atualizado nesta tela.",
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

function unavailableBankCopy(status: CredereStoreStatus) {
  const names = status.unavailableBanks
    .map((bank) => bank.name ?? bank.code)
    .slice(0, 3)
    .join(", ");
  const authorizationRequired = status.unavailableBanks.some(
    (bank) => bank.reason === "authorization_required",
  );
  const guidance = authorizationRequired
    ? "A autorização de ao menos um banco precisa ser renovada pela conta responsável pela conexão."
    : "Esses bancos não aceitarão consultas até a integração voltar a ficar saudável.";
  return `${names}${status.unavailableBanks.length > 3 ? " e outros" : ""}. ${guidance} ${status.usableBanks.length > 0 ? `Você ainda pode consultar ${status.usableBanks.length} banco(s) habilitado(s).` : ""}`;
}

export function createPrefillIdentity(prefill: SimulationPrefill) {
  return JSON.stringify(
    Object.keys(prefill)
      .sort()
      .map((key) => [key, prefill[key as keyof SimulationPrefill] ?? null]),
  );
}
