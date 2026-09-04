import type { ReactNode } from "react";
import {
  formatSimulationCurrency,
  simulationFinancedAmount,
} from "./simulationStepReadiness";

export type SimulationReviewDossierProps = {
  applicantName: string;
  downPayment: number | null;
  fipeCode: string;
  installments: string;
  licensingCity: string;
  licensingUf: string;
  manufactureYear: string;
  modelYear: string;
  molicarCode: string;
  preflightReady: boolean;
  vehicleName: string | null;
  vehicleValue: number | null;
  versionLabel: string | null;
  zeroKm: boolean;
};

export function SimulationReviewDossier({
  applicantName,
  downPayment,
  fipeCode,
  installments,
  licensingCity,
  licensingUf,
  manufactureYear,
  modelYear,
  molicarCode,
  preflightReady,
  vehicleName,
  vehicleValue,
  versionLabel,
  zeroKm,
}: SimulationReviewDossierProps) {
  const financedAmount = simulationFinancedAmount(vehicleValue, downPayment);
  const years =
    manufactureYear && modelYear
      ? `${manufactureYear}/${modelYear}${zeroKm ? " · 0 km" : ""}`
      : null;
  const licensing =
    licensingUf && licensingCity ? `${licensingCity} · ${licensingUf}` : null;

  return (
    <div className="credere-form-review">
      <div className="credere-form-review-highlight">
        <span>Valor financiado</span>
        <strong>
          {formatSimulationCurrency(financedAmount) ?? "Pendente"}
        </strong>
        <small>
          {installments === "all"
            ? "Todas as parcelas (12x a 60x)"
            : `${installments}x`}
        </small>
      </div>

      <dl className="credere-form-review-groups">
        <ReviewGroup label="Proponente">
          <ReviewRow label="Nome">
            {applicantName.trim() || "Proponente não informado"}
          </ReviewRow>
          <ReviewRow label="Credere">
            {applicantName.trim()
              ? preflightReady
                ? "Conferido"
                : "Conferência pendente"
              : "Pendente"}
          </ReviewRow>
        </ReviewGroup>

        <ReviewGroup label="Veículo">
          <ReviewRow label="Modelo">
            {vehicleName ?? "Veículo selecionado"}
          </ReviewRow>
          <ReviewRow label="Anos">{years ?? "Anos pendentes"}</ReviewRow>
          <ReviewRow label="Versão confirmada">
            {versionLabel
              ? `${versionLabel} · Molicar ${molicarCode}`
              : "Versão FIPE/Molicar pendente"}
          </ReviewRow>
          <ReviewRow label="FIPE">{fipeCode || "FIPE pendente"}</ReviewRow>
          <ReviewRow label="Licenciamento">
            {licensing ?? "UF/cidade pendentes"}
          </ReviewRow>
        </ReviewGroup>

        <ReviewGroup label="Condições">
          <ReviewRow label="Valor" value>
            {formatSimulationCurrency(vehicleValue) ?? "Valor pendente"}
          </ReviewRow>
          <ReviewRow label="Entrada">
            {formatSimulationCurrency(downPayment) ?? "Entrada pendente"}
          </ReviewRow>
        </ReviewGroup>
      </dl>
    </div>
  );
}

function ReviewGroup({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <section className="credere-form-review-group">
      <h4 className="credere-form-review-group-title">{label}</h4>
      {children}
    </section>
  );
}

function ReviewRow({
  children,
  label,
  value = false,
}: {
  children: ReactNode;
  label: string;
  value?: boolean;
}) {
  return (
    <div
      className={
        value
          ? "credere-form-review-row credere-form-review-row--value"
          : "credere-form-review-row"
      }
    >
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
