import { Check } from "lucide-react";
import {
  formatSimulationCurrency,
  simulationFinancedAmount,
} from "./simulationStepReadiness";

export type SimulationSummaryChecklistItem = {
  complete: boolean;
  label: string;
};

export type SimulationSummarySidebarProps = {
  applicantName: string;
  bankCount: number;
  checklist: readonly SimulationSummaryChecklistItem[];
  downPayment: number | null;
  fipeCode: string;
  licensingCity: string;
  licensingUf: string;
  manufactureYear: string;
  modelYear: string;
  molicarCode: string;
  preflightReady: boolean;
  vehicleName: string | null;
  vehicleValue: number | null;
  versionLabel: string | null;
};

export function SimulationSummarySidebar({
  applicantName,
  bankCount,
  checklist,
  downPayment,
  fipeCode,
  licensingCity,
  licensingUf,
  manufactureYear,
  modelYear,
  molicarCode,
  preflightReady,
  vehicleName,
  vehicleValue,
  versionLabel,
}: SimulationSummarySidebarProps) {
  const completedCount = checklist.filter((item) => item.complete).length;
  const financedAmount = simulationFinancedAmount(vehicleValue, downPayment);
  const years =
    manufactureYear && modelYear ? `${manufactureYear}/${modelYear}` : null;
  const licensing =
    licensingUf && licensingCity ? `${licensingCity} · ${licensingUf}` : null;

  return (
    <aside
      aria-label="Resumo da simulação"
      className="credere-sidebar"
      data-testid="simulation-summary-sidebar"
    >
      <div className="credere-sidebar-panel">
        <header className="credere-sidebar-head">
          <h3 className="credere-sidebar-title">Resumo da simulação</h3>
          <span className="credere-sidebar-count">
            {completedCount}/{checklist.length}
          </span>
        </header>

        <dl className="credere-sidebar-facts">
          <SidebarFact label="Veículo" value={vehicleName} />
          <SidebarFact label="Anos" value={years} />
          <SidebarFact
            label="Versão confirmada"
            value={
              versionLabel ? `${versionLabel} · Molicar ${molicarCode}` : null
            }
          />
          <SidebarFact label="FIPE" value={fipeCode || null} />
          <SidebarFact label="Licenciamento" value={licensing} />
          <SidebarFact
            label="Proponente"
            value={
              applicantName.trim()
                ? `${applicantName.trim()} · ${
                    preflightReady
                      ? "Credere conferido"
                      : "conferência pendente"
                  }`
                : null
            }
          />
          <SidebarFact
            label="Valor do veículo"
            value={formatSimulationCurrency(vehicleValue)}
          />
          <SidebarFact
            label="Entrada"
            value={formatSimulationCurrency(downPayment)}
          />
          <SidebarFact
            highlight
            label="Valor financiado"
            value={formatSimulationCurrency(financedAmount)}
          />
          <SidebarFact
            label="Bancos"
            value={bankCount > 0 ? `${bankCount} selecionado(s)` : null}
          />
        </dl>

        <div className="credere-sidebar-progress">
          <span
            className="credere-sidebar-progress-bar"
            style={{
              width: `${(completedCount / Math.max(1, checklist.length)) * 100}%`,
            }}
          />
        </div>

        <ul className="credere-sidebar-checklist">
          {checklist.map((item) => (
            <li
              className="credere-sidebar-checklist-item"
              data-complete={item.complete || undefined}
              key={item.label}
            >
              <span
                aria-hidden="true"
                className="credere-sidebar-checklist-mark"
              >
                {item.complete ? <Check /> : null}
              </span>
              <span className="credere-sidebar-checklist-label">
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function SidebarFact({
  highlight = false,
  label,
  value,
}: {
  highlight?: boolean;
  label: string;
  value: string | null;
}) {
  return (
    <div
      className="credere-sidebar-fact"
      data-highlight={highlight || undefined}
    >
      <dt>{label}</dt>
      <dd>{value ?? "Pendente"}</dd>
    </div>
  );
}
