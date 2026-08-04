import type { ChangeEvent } from "react";
import {
  FeatureField,
  FeatureFieldGroup,
} from "../../components/ui/FeatureForms";
import {
  FeatureInput,
  FeatureSegmentedControl,
  FeatureSelect,
} from "../../components/ui/FeatureControls";
import {
  applyInputMask,
  formatBrazilianDocument,
  formatBrazilianPhone,
  formatCurrencyValue,
} from "../../lib/masks";

const installmentOptions = [12, 24, 36, 48, 60].map((months) => ({
  label: `${months}x`,
  value: String(months),
}));
export function SimulationApplicantFields({
  cpfCnpj,
  email,
  income,
  name,
  onCpfCnpjChange,
  onEmailChange,
  onIncomeChange,
  onNameChange,
  onPhoneChange,
  phone,
}: {
  cpfCnpj: string;
  email: string;
  income: number | null;
  name: string;
  onCpfCnpjChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onIncomeChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  phone: string;
}) {
  return (
    <FeatureFieldGroup>
      <FeatureField label="Nome do proponente">
        <FeatureInput
          autoComplete="name"
          onChange={(event) => onNameChange(event.target.value)}
          value={name}
        />
      </FeatureField>
      <FeatureField label="CPF/CNPJ">
        <FeatureInput
          inputMode="numeric"
          onChange={(event) =>
            onCpfCnpjChange(
              applyInputMask(event.target, formatBrazilianDocument),
            )
          }
          value={cpfCnpj}
        />
      </FeatureField>
      <FeatureField label="Telefone">
        <FeatureInput
          inputMode="tel"
          onChange={(event) =>
            onPhoneChange(applyInputMask(event.target, formatBrazilianPhone))
          }
          value={phone}
        />
      </FeatureField>
      <FeatureField label="E-mail (opcional)">
        <FeatureInput
          autoComplete="email"
          onChange={(event) => onEmailChange(event.target.value)}
          type="email"
          value={email}
        />
      </FeatureField>
      <FeatureField label="Renda mensal (R$, opcional)">
        <FeatureInput
          inputMode="decimal"
          onChange={onIncomeChange}
          value={income === null ? "" : formatCurrencyValue(income)}
        />
      </FeatureField>
    </FeatureFieldGroup>
  );
}

export function SimulationTermsFields({
  downPayment,
  installments,
  onDownPaymentChange,
  onInstallmentsChange,
  onVehicleValueChange,
  vehicleValue,
}: {
  downPayment: number | null;
  installments: string;
  onDownPaymentChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onInstallmentsChange: (value: string) => void;
  onVehicleValueChange: (event: ChangeEvent<HTMLInputElement>) => void;
  vehicleValue: number | null;
}) {
  return (
    <FeatureFieldGroup>
      <FeatureField label="Valor do veículo (R$)">
        <FeatureInput
          inputMode="decimal"
          onChange={onVehicleValueChange}
          value={vehicleValue === null ? "" : formatCurrencyValue(vehicleValue)}
        />
      </FeatureField>
      <FeatureField label="Entrada (R$)">
        <FeatureInput
          inputMode="decimal"
          onChange={onDownPaymentChange}
          value={downPayment === null ? "" : formatCurrencyValue(downPayment)}
        />
      </FeatureField>
      <FeatureField label="Parcelas">
        <FeatureSelect
          ariaLabel="Número de parcelas"
          onChange={onInstallmentsChange}
          options={installmentOptions}
          value={installments}
        />
      </FeatureField>
    </FeatureFieldGroup>
  );
}

export function SimulationVehicleFields({
  licensingCity,
  licensingUf,
  manufactureYear,
  modelYear,
  molicarCode,
  onLicensingCityChange,
  onLicensingUfChange,
  onManufactureYearChange,
  onModelYearChange,
  onMolicarCodeChange,
  onZeroKmChange,
  zeroKm,
}: {
  licensingCity: string;
  licensingUf: string;
  manufactureYear: string;
  modelYear: string;
  molicarCode: string;
  onLicensingCityChange: (value: string) => void;
  onLicensingUfChange: (value: string) => void;
  onManufactureYearChange: (value: string) => void;
  onModelYearChange: (value: string) => void;
  onMolicarCodeChange: (value: string) => void;
  onZeroKmChange: (value: boolean) => void;
  zeroKm: boolean;
}) {
  return (
    <FeatureFieldGroup>
      <FeatureField label="Ano fabricação">
        <FeatureInput
          inputMode="numeric"
          maxLength={4}
          onChange={(event) => onManufactureYearChange(event.target.value)}
          value={manufactureYear}
        />
      </FeatureField>
      <FeatureField label="Ano modelo">
        <FeatureInput
          inputMode="numeric"
          maxLength={4}
          onChange={(event) => onModelYearChange(event.target.value)}
          value={modelYear}
        />
      </FeatureField>
      <FeatureField label="Código Molicar">
        <FeatureInput
          onChange={(event) => onMolicarCodeChange(event.target.value)}
          value={molicarCode}
        />
      </FeatureField>
      <FeatureField label="UF de licenciamento">
        <FeatureInput
          maxLength={2}
          onChange={(event) => onLicensingUfChange(event.target.value)}
          value={licensingUf}
        />
      </FeatureField>
      <FeatureField label="Cidade de licenciamento">
        <FeatureInput
          onChange={(event) => onLicensingCityChange(event.target.value)}
          value={licensingCity}
        />
      </FeatureField>
      <FeatureField as="div" label="Condição">
        <FeatureSegmentedControl
          ariaLabel="Condição do veículo"
          onChange={(value: "used" | "zero") =>
            onZeroKmChange(value === "zero")
          }
          options={[
            { label: "Usado", value: "used" },
            { label: "0 km", value: "zero" },
          ]}
          value={zeroKm ? "zero" : "used"}
        />
      </FeatureField>
    </FeatureFieldGroup>
  );
}
