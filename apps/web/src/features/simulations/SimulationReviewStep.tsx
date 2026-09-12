import { Check } from "lucide-react";
import { FeatureFormSection } from "../../components/ui/FeatureForms";
import { SimulationBankSelector } from "./SimulationBankSelector";
import { SimulationReviewDossier } from "./SimulationReviewDossier";
import type { CredereUsableBank } from "./types";

export function SimulationReviewStep({
  applicantName,
  bankCodes,
  banks,
  consent,
  consentInvalid = false,
  downPayment,
  fipeCode,
  installments,
  licensingCity,
  licensingUf,
  manufactureYear,
  modelYear,
  molicarCode,
  onConsentChange,
  onToggleBank,
  preflightReady,
  vehicleName,
  vehicleValue,
  versionLabel,
  zeroKm,
}: {
  applicantName: string;
  bankCodes: readonly string[];
  banks: readonly CredereUsableBank[];
  consent: boolean;
  consentInvalid?: boolean;
  downPayment: number | null;
  fipeCode: string;
  installments: string;
  licensingCity: string;
  licensingUf: string;
  manufactureYear: string;
  modelYear: string;
  molicarCode: string;
  onConsentChange: (value: boolean) => void;
  onToggleBank: (code: string) => void;
  preflightReady: boolean;
  vehicleName: string | null;
  vehicleValue: number | null;
  versionLabel: string | null;
  zeroKm: boolean;
}) {
  return (
    <FeatureFormSection
      className="credere-form-section"
      description="Todas as instituições utilizáveis começam habilitadas. Desmarque somente as que não devem receber a consulta."
      title="Revisão e instituições"
    >
      <div className="grid gap-5">
        <SimulationReviewDossier
          applicantName={applicantName}
          downPayment={downPayment}
          fipeCode={fipeCode}
          installments={installments}
          licensingCity={licensingCity}
          licensingUf={licensingUf}
          manufactureYear={manufactureYear}
          modelYear={modelYear}
          molicarCode={molicarCode}
          preflightReady={preflightReady}
          vehicleName={vehicleName}
          vehicleValue={vehicleValue}
          versionLabel={versionLabel}
          zeroKm={zeroKm}
        />
        <SimulationBankSelector
          bankCodes={bankCodes}
          banks={banks}
          onToggleBank={onToggleBank}
        />
        <div>
          <label
            className={`credere-form-consent ${consentInvalid ? "credere-form-consent--invalid" : ""}`}
            data-checked={consent || undefined}
            data-invalid={consentInvalid || undefined}
          >
            <input
              checked={consent}
              className="credere-form-consent-input"
              onChange={(event) => onConsentChange(event.target.checked)}
              type="checkbox"
            />
            <span aria-hidden="true" className="credere-form-consent-box">
              <Check />
            </span>
            <span className="credere-form-consent-text">
              O proponente autorizou expressamente a consulta de seus dados
              junto aos bancos parceiros para esta simulação.
            </span>
          </label>
          {consentInvalid ? (
            <span
              className="mt-1 block text-xs font-semibold text-danger"
              role="alert"
            >
              O proponente precisa autorizar a consulta antes de enviar.
            </span>
          ) : null}
        </div>
      </div>
    </FeatureFormSection>
  );
}
