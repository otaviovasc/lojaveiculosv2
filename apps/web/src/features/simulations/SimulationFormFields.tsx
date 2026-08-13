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
    <FeatureFieldGroup className="credere-form-fields">
      <FeatureField label="Nome do proponente">
        <FeatureInput
          className="credere-form-input"
          autoComplete="name"
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Ex.: Ana Souza"
          value={name}
        />
      </FeatureField>
      <FeatureField label="CPF/CNPJ">
        <FeatureInput
          className="credere-form-input"
          inputMode="numeric"
          onChange={(event) =>
            onCpfCnpjChange(
              applyInputMask(event.target, formatBrazilianDocument),
            )
          }
          onBlur={onCpfCnpjBlur}
          placeholder="000.000.000-00"
          value={cpfCnpj}
        />
      </FeatureField>
      <FeatureField label="Telefone">
        <FeatureInput
          className="credere-form-input"
          inputMode="tel"
          onChange={(event) =>
            onPhoneChange(applyInputMask(event.target, formatBrazilianPhone))
          }
          placeholder="(11) 99999-9999"
          value={phone}
        />
      </FeatureField>
      <FeatureField
        label={`E-mail${requiredFields.has("email") ? "" : " (opcional)"}`}
      >
        <FeatureInput
          className="credere-form-input"
          autoComplete="email"
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="ana@exemplo.com"
          type="email"
          value={email}
        />
      </FeatureField>
      <FeatureField
        label={`Renda mensal (R$${requiredFields.has("monthlyIncomeCents") ? "" : ", opcional"})`}
      >
        <FeatureInput
          className="credere-form-input"
          inputMode="decimal"
          onChange={onIncomeChange}
          placeholder="Ex.: 5.000,00"
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
            className="credere-form-select"
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
    <FeatureFieldGroup className="credere-form-fields">
      <FeatureField label="Valor do veículo (R$)">
        <FeatureInput
          className="credere-form-input"
          inputMode="decimal"
          onChange={onVehicleValueChange}
          placeholder="Ex.: 85.000,00"
          value={vehicleValue === null ? "" : formatCurrencyValue(vehicleValue)}
        />
      </FeatureField>
      <FeatureField label="Entrada (R$)">
        <FeatureInput
          className="credere-form-input"
          inputMode="decimal"
          onChange={onDownPaymentChange}
          placeholder="Ex.: 20.000,00"
          value={downPayment === null ? "" : formatCurrencyValue(downPayment)}
        />
      </FeatureField>
      <FeatureField label="Parcelas">
        <FeatureSelect
          className="credere-form-select"
          ariaLabel="Número de parcelas"
          onChange={onInstallmentsChange}
          options={termOptions}
          value={installments}
        />
      </FeatureField>
      <FeatureField label="Documentação (R$, opcional)">
        <FeatureInput
          className="credere-form-input"
          inputMode="decimal"
          onChange={onDocumentationValueChange}
          placeholder="Ex.: 1.500,00"
          value={
            documentationValue === null
              ? ""
              : formatCurrencyValue(documentationValue)
          }
        />
      </FeatureField>
      <FeatureField label="Acessórios (R$, opcional)">
        <FeatureInput
          className="credere-form-input"
          inputMode="decimal"
          onChange={onAccessoryValueChange}
          placeholder="Ex.: 2.000,00"
          value={
            accessoryValue === null ? "" : formatCurrencyValue(accessoryValue)
          }
        />
      </FeatureField>
      <FeatureField label="Seguro (R$, opcional)">
        <FeatureInput
          className="credere-form-input"
          inputMode="decimal"
          onChange={onInsuranceValueChange}
          placeholder="Ex.: 1.200,00"
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
    <FeatureFieldGroup className="credere-form-fields">
      <FeatureField label="Ano fabricação">
        <FeatureInput
          className="credere-form-input"
          inputMode="numeric"
          maxLength={4}
          onChange={(event) => onManufactureYearChange(event.target.value)}
          placeholder="Ex.: 2023"
          value={manufactureYear}
        />
      </FeatureField>
      <FeatureField label="Ano modelo">
        <FeatureInput
          className="credere-form-input"
          inputMode="numeric"
          maxLength={4}
          onChange={(event) => onModelYearChange(event.target.value)}
          placeholder="Ex.: 2024"
          value={modelYear}
        />
      </FeatureField>
      <FeatureField label="Código Molicar">
        <FeatureInput
          aria-describedby="simulation-molicar-hint"
          className="credere-form-input credere-form-input--locked"
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
          className="credere-form-select"
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
          className="credere-form-select"
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
