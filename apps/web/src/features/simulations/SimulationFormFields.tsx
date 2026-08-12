import { BRAZILIAN_STATES, getCitiesByStateCode } from "@lojaveiculosv2/shared";
import type { ChangeEvent } from "react";
import {
  FeatureField,
  FeatureFieldGroup,
} from "../../components/ui/FeatureForms";
import {
  FeatureDateField,
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
const termOptions = [
  { label: "Todos (12x a 60x)", value: "all" },
  ...installmentOptions,
];
const stateOptions = BRAZILIAN_STATES.map((state) => ({
  label: `${state.code} — ${state.name}`,
  value: state.code,
}));
export function SimulationApplicantFields({
  birthDate,
  cpfCnpj,
  email,
  hasCnh,
  income,
  name,
  onBirthDateChange,
  onCpfCnpjChange,
  onCpfCnpjBlur,
  onEmailChange,
  onHasCnhChange,
  onIncomeChange,
  onNameChange,
  onPhoneChange,
  phone,
  requiredFields,
}: {
  birthDate: string;
  cpfCnpj: string;
  email: string;
  hasCnh: boolean | null;
  income: number | null;
  name: string;
  onBirthDateChange: (value: string) => void;
  onCpfCnpjChange: (value: string) => void;
  onCpfCnpjBlur: () => void;
  onEmailChange: (value: string) => void;
  onHasCnhChange: (value: boolean | null) => void;
  onIncomeChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  phone: string;
  requiredFields: ReadonlySet<string>;
}) {
  const needsBirthDate = requiredFields.has("birthDate");
  const needsHasCnh = requiredFields.has("hasCnh");
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
          onBlur={onCpfCnpjBlur}
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
      <FeatureField
        label={`E-mail${requiredFields.has("email") ? "" : " (opcional)"}`}
      >
        <FeatureInput
          autoComplete="email"
          onChange={(event) => onEmailChange(event.target.value)}
          type="email"
          value={email}
        />
      </FeatureField>
      <FeatureField
        label={`Renda mensal (R$${requiredFields.has("monthlyIncomeCents") ? "" : ", opcional"})`}
      >
        <FeatureInput
          inputMode="decimal"
          onChange={onIncomeChange}
          value={income === null ? "" : formatCurrencyValue(income)}
        />
      </FeatureField>
      {needsBirthDate ? (
        <FeatureField as="div" label="Data de nascimento">
          <FeatureDateField
            label="Data de nascimento"
            max={new Date().toISOString().slice(0, 10)}
            min="1900-01-01"
            onChange={onBirthDateChange}
            value={birthDate}
          />
        </FeatureField>
      ) : null}
      {needsHasCnh ? (
        <FeatureField label="Possui CNH">
          <FeatureSelect
            ariaLabel="Possui CNH"
            onChange={(value) => onHasCnhChange(value === "yes" ? true : false)}
            options={[
              { label: "Sim", value: "yes" },
              { label: "Não", value: "no" },
            ]}
            placeholder="Selecione"
            value={hasCnh === null ? undefined : hasCnh ? "yes" : "no"}
          />
        </FeatureField>
      ) : null}
    </FeatureFieldGroup>
  );
}

export function SimulationTermsFields({
  accessoryValue,
  documentationValue,
  downPayment,
  installments,
  insuranceValue,
  onAccessoryValueChange,
  onDocumentationValueChange,
  onDownPaymentChange,
  onInsuranceValueChange,
  onInstallmentsChange,
  onVehicleValueChange,
  vehicleValue,
}: {
  accessoryValue: number | null;
  documentationValue: number | null;
  downPayment: number | null;
  installments: string;
  insuranceValue: number | null;
  onAccessoryValueChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDocumentationValueChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDownPaymentChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onInsuranceValueChange: (event: ChangeEvent<HTMLInputElement>) => void;
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
          options={termOptions}
          value={installments}
        />
      </FeatureField>
      <FeatureField label="Documentação (R$, opcional)">
        <FeatureInput
          inputMode="decimal"
          onChange={onDocumentationValueChange}
          value={
            documentationValue === null
              ? ""
              : formatCurrencyValue(documentationValue)
          }
        />
      </FeatureField>
      <FeatureField label="Acessórios (R$, opcional)">
        <FeatureInput
          inputMode="decimal"
          onChange={onAccessoryValueChange}
          value={
            accessoryValue === null ? "" : formatCurrencyValue(accessoryValue)
          }
        />
      </FeatureField>
      <FeatureField label="Seguro (R$, opcional)">
        <FeatureInput
          inputMode="decimal"
          onChange={onInsuranceValueChange}
          value={
            insuranceValue === null ? "" : formatCurrencyValue(insuranceValue)
          }
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
  const cityOptions = getCitiesByStateCode(licensingUf).map((city) => ({
    label: city,
    value: city,
  }));
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
          aria-describedby="simulation-molicar-hint"
          onChange={(event) => onMolicarCodeChange(event.target.value)}
          placeholder="Confirme primeiro o código FIPE"
          readOnly
          value={molicarCode}
        />
        <span className="sr-only" id="simulation-molicar-hint">
          Preenchido após a confirmação da versão FIPE na Credere.
        </span>
      </FeatureField>
      <FeatureField label="UF de licenciamento">
        <FeatureSelect
          ariaLabel="UF de licenciamento"
          onChange={onLicensingUfChange}
          options={stateOptions}
          placeholder="Selecione a UF"
          searchable
          value={licensingUf}
        />
      </FeatureField>
      <FeatureField label="Cidade de licenciamento">
        <FeatureSelect
          ariaLabel="Cidade de licenciamento"
          disabled={!licensingUf}
          onChange={onLicensingCityChange}
          options={cityOptions}
          placeholder={licensingUf ? "Selecione a cidade" : "Escolha a UF"}
          searchable
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
