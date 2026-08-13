import type { ReactNode } from "react";
import {
  formatSimulationCurrency,
  simulationFinancedAmount,
} from "./simulationStepReadiness";
import type { CredereUsableBank } from "./types";

export type SimulationReviewDossierProps = {
  applicantName: string;
  bankCodes: readonly string[];
  banks: readonly CredereUsableBank[];
  consent: boolean;
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
  bankCodes,
  banks,
  consent,
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
  const selectedBankNames = banks
    .filter((bank) => bankCodes.includes(bank.code))
    .map((bank) => bank.name ?? bank.code);
  const years =
    manufactureYear && modelYear
      ? `${manufactureYear}/${modelYear}${zeroKm ? " · 0 km" : ""}`
      : null;
  const licensing =
    licensingUf && licensingCity ? `${licensingCity} · ${licensingUf}` : null;

  return (
    <dl className="credere-form-review">
      <ReviewRow label="Proponente">
        {applicantName.trim() || "Proponente não informado"}
        {applicantName.trim()
          ? ` · ${preflightReady ? "Credere conferido" : "conferência pendente"}`
          : ""}
      </ReviewRow>
      <ReviewRow label="Veículo">
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
      <ReviewRow label="Valor" value>
        {formatSimulationCurrency(vehicleValue) ?? "Valor pendente"}
      </ReviewRow>
      <ReviewRow label="Entrada">
        {formatSimulationCurrency(downPayment) ?? "Entrada pendente"}
      </ReviewRow>
      <ReviewRow label="Valor financiado">
        {formatSimulationCurrency(financedAmount) ?? "Financiamento pendente"}
      </ReviewRow>
      <ReviewRow label="Parcelas">
        {installments === "all" ? "Todas (12x a 60x)" : `${installments}x`}
      </ReviewRow>
      <ReviewRow label="Bancos">
        {selectedBankNames.length
          ? `${selectedBankNames.join(", ")} (${selectedBankNames.length})`
          : "Nenhum banco selecionado"}
      </ReviewRow>
      <ReviewRow label="Consentimento">
        {consent
          ? "Autorizado pelo proponente"
          : "Pendente — marque a autorização abaixo"}
      </ReviewRow>
    </dl>
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
