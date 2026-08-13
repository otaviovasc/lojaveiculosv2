import { ArrowUpRight, Landmark } from "lucide-react";
import { useEffect, useState } from "react";
import "../../styles/credere-panels.css";
import { FeatureStatusBadge } from "../../components/ui/FeatureStates";
import { createCredereApi } from "../simulations/apiClient";
import { createRuntimeCredereOptions } from "../simulations/simulationPageUtils";
import { simulationStatusLabel } from "../simulations/simulationPresentation";
import type { CredereSimulation } from "../simulations/types";
import type { ProductCrmLead } from "./productCrmTypes";

export function CrmCredereOfficialPanel({
  lead,
  loadSimulations = loadCredereSimulations,
}: {
  lead: ProductCrmLead;
  loadSimulations?: () => Promise<CredereSimulation[]>;
}) {
  const [history, setHistory] = useState<
    | { status: "loading" }
    | { status: "ready"; items: CredereSimulation[] }
    | { status: "error" }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void loadSimulations()
      .then((items) => {
        if (!cancelled) {
          setHistory({
            items: items.filter((simulation) => simulation.leadId === lead.id),
            status: "ready",
          });
        }
      })
      .catch(() => {
        if (!cancelled) setHistory({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [lead.id, loadSimulations]);

  return (
    <section className="credere-panel">
      <header className="credere-panel-header">
        <div className="credere-panel-heading">
          <span aria-hidden="true" className="credere-panel-mark">
            <Landmark className="size-4" />
          </span>
          <div>
            <p className="credere-panel-eyebrow">Financiamento oficial</p>
            <h3 className="credere-panel-title">Consulta oficial Credere</h3>
            <p className="credere-panel-subtitle">
              Envie aos bancos habilitados e acompanhe o retorno oficial.
            </p>
          </div>
        </div>
        <a className="credere-panel-cta" href={credereSimulationHref(lead)}>
          Simular no Credere
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </a>
      </header>
      {history.status === "loading" ? (
        <div className="credere-panel-skeleton" role="status">
          <span className="sr-only">Carregando histórico oficial…</span>
          <div className="credere-panel-skeleton-row" />
          <div className="credere-panel-skeleton-row" />
          <div className="credere-panel-skeleton-row" />
        </div>
      ) : history.status === "error" ? (
        <p
          className="credere-panel-state credere-panel-state--error"
          role="alert"
        >
          Não foi possível carregar o histórico oficial da Credere agora.
        </p>
      ) : history.items.length ? (
        <div className="credere-panel-history">
          {history.items.slice(0, 3).map((simulation) => (
            <div className="credere-panel-history-row" key={simulation.id}>
              <div className="credere-panel-history-info">
                <strong className="credere-panel-history-title">
                  {conditionsLabel(simulation.conditions.length)}
                </strong>
                <p className="credere-panel-history-date">
                  {simulation.createdAt
                    ? new Date(simulation.createdAt).toLocaleString("pt-BR")
                    : "Data não informada"}
                </p>
              </div>
              <FeatureStatusBadge tone={statusTone(simulation.status)}>
                {simulationStatusLabel(simulation.status)}
              </FeatureStatusBadge>
            </div>
          ))}
        </div>
      ) : (
        <p className="credere-panel-state">
          Nenhuma consulta oficial vinculada a este lead.
        </p>
      )}
    </section>
  );
}

function loadCredereSimulations() {
  return createRuntimeCredereOptions()
    .then(createCredereApi)
    .then((api) => api.listSimulations());
}

function credereSimulationHref(lead: ProductCrmLead) {
  const params = new URLSearchParams({ leadId: lead.id });
  if (lead.listingId) params.set("listingId", lead.listingId);
  return `/simulations?${params.toString()}`;
}

function conditionsLabel(count: number) {
  return count === 1 ? "1 condição" : `${count} condições`;
}

function statusTone(status: string) {
  if (status === "completed") return "success" as const;
  if (status === "failed") return "danger" as const;
  return "warning" as const;
}
