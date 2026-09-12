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
  birthDateInvalid = false,
  cpfCnpj,
  cpfCnpjInvalid = false,
  email,
  emailInvalid = false,
  hasCnh,
  hasCnhInvalid = false,
  income,
  incomeInvalid = false,
  name,
  nameInvalid = false,
  onBirthDateChange,
  onCpfCnpjBlur,
  onCpfCnpjChange,
  onEmailChange,
  onHasCnhChange,
  onIncomeChange,
  onNameChange,
  onPhoneChange,
  phone,
  phoneInvalid = false,
  requiredFields,
}: {
  birthDate: string;
  birthDateInvalid?: boolean;
  cpfCnpj: string;
  cpfCnpjInvalid?: boolean;
  email: string;
  emailInvalid?: boolean;
  hasCnh: boolean | null;
  hasCnhInvalid?: boolean;
  income: number | null;
  incomeInvalid?: boolean;
  name: string;
  nameInvalid?: boolean;
  onBirthDateChange: (value: string) => void;
  onCpfCnpjBlur: () => void;
  onCpfCnpjChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onHasCnhChange: (value: boolean | null) => void;
  onIncomeChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  phone: string;
  phoneInvalid?: boolean;
  requiredFields: ReadonlySet<string>;
}) {
  const needsBirthDate = requiredFields.has("birthDate");
  const needsHasCnh = requiredFields.has("hasCnh");
  return (
    <FeatureFieldGroup className="credere-form-fields">
      <FeatureField
        error={nameInvalid ? "Nome do proponente é obrigatório" : undefined}
        label="Nome do proponente"
      >
        <FeatureInput
          autoComplete="name"
          className="credere-form-input"
          data-invalid={nameInvalid ? "true" : undefined}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Ex.: Ana Souza"
          value={name}
        />
      </FeatureField>
      <FeatureField
        error={cpfCnpjInvalid ? "CPF/CNPJ válido é obrigatório" : undefined}
        label="CPF/CNPJ"
      >
        <FeatureInput
          className="credere-form-input"
          data-invalid={cpfCnpjInvalid ? "true" : undefined}
          inputMode="numeric"
          onBlur={onCpfCnpjBlur}
          onChange={(event) =>
            onCpfCnpjChange(
              applyInputMask(event.target, formatBrazilianDocument),
            )
          }
          placeholder="000.000.000-00"
          value={cpfCnpj}
        />
      </FeatureField>
      <FeatureField
        error={
          phoneInvalid ? "Telefone do proponente é obrigatório" : undefined
        }
        label="Telefone"
      >
        <FeatureInput
          className="credere-form-input"
          data-invalid={phoneInvalid ? "true" : undefined}
          inputMode="tel"
          onChange={(event) =>
            onPhoneChange(applyInputMask(event.target, formatBrazilianPhone))
          }
          placeholder="(11) 99999-9999"
          value={phone}
        />
      </FeatureField>
      <FeatureField
        error={emailInvalid ? "E-mail é obrigatório" : undefined}
        label={`E-mail${requiredFields.has("email") ? "" : " (opcional)"}`}
      >
        <FeatureInput
          autoComplete="email"
          className="credere-form-input"
          data-invalid={emailInvalid ? "true" : undefined}
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="ana@exemplo.com"
          type="email"
          value={email}
        />
      </FeatureField>
      <FeatureField
        error={incomeInvalid ? "Renda mensal é obrigatória" : undefined}
        label={`Renda mensal (R$${requiredFields.has("monthlyIncomeCents") ? "" : ", opcional"})`}
      >
        <FeatureInput
          className="credere-form-input"
          data-invalid={incomeInvalid ? "true" : undefined}
          inputMode="decimal"
          onChange={onIncomeChange}
          placeholder="Ex.: 5.000,00"
          value={income === null ? "" : formatCurrencyValue(income)}
        />
      </FeatureField>
      {needsBirthDate ? (
        <FeatureField
          as="div"
          error={
            birthDateInvalid ? "Data de nascimento é obrigatória" : undefined
          }
          label="Data de nascimento"
        >
          <FeatureDateField
            invalid={birthDateInvalid}
            label="Data de nascimento"
            max={new Date().toISOString().slice(0, 10)}
            min="1900-01-01"
            onChange={onBirthDateChange}
            value={birthDate}
          />
        </FeatureField>
      ) : null}
      {needsHasCnh ? (
        <FeatureField
          error={hasCnhInvalid ? "Informe se possui CNH" : undefined}
          label="Possui CNH"
        >
          <FeatureSelect
            ariaLabel="Possui CNH"
            className="credere-form-select"
            invalid={hasCnhInvalid}
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
  downPaymentInvalid = false,
  installments,
  insuranceValue,
  onAccessoryValueChange,
  onDocumentationValueChange,
  onDownPaymentChange,
  onInsuranceValueChange,
  onInstallmentsChange,
  onVehicleValueChange,
  vehicleValue,
  vehicleValueInvalid = false,
}: {
  accessoryValue: number | null;
  documentationValue: number | null;
  downPayment: number | null;
  downPaymentInvalid?: boolean;
  installments: string;
  insuranceValue: number | null;
  onAccessoryValueChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDocumentationValueChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDownPaymentChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onInsuranceValueChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onInstallmentsChange: (value: string) => void;
  onVehicleValueChange: (event: ChangeEvent<HTMLInputElement>) => void;
  vehicleValue: number | null;
  vehicleValueInvalid?: boolean;
}) {
  return (
    <FeatureFieldGroup className="credere-form-fields">
      <FeatureField
        error={
          vehicleValueInvalid ? "Valor do veículo é obrigatório" : undefined
        }
        label="Valor do veículo (R$)"
      >
        <FeatureInput
          className="credere-form-input"
          data-invalid={vehicleValueInvalid ? "true" : undefined}
          inputMode="decimal"
          onChange={onVehicleValueChange}
          placeholder="Ex.: 85.000,00"
          value={vehicleValue === null ? "" : formatCurrencyValue(vehicleValue)}
        />
      </FeatureField>
      <FeatureField
        error={
          downPaymentInvalid
            ? "Entrada deve ser maior que zero e menor que o valor do veículo"
            : undefined
        }
        label="Entrada (R$)"
      >
        <FeatureInput
          className="credere-form-input"
          data-invalid={downPaymentInvalid ? "true" : undefined}
          inputMode="decimal"
          onChange={onDownPaymentChange}
          placeholder="Ex.: 20.000,00"
          value={downPayment === null ? "" : formatCurrencyValue(downPayment)}
        />
      </FeatureField>
      <FeatureField label="Parcelas">
        <FeatureSelect
          ariaLabel="Número de parcelas"
          className="credere-form-select"
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
  licensingCityInvalid = false,
  licensingUf,
  licensingUfInvalid = false,
  manufactureYear,
  manufactureYearInvalid = false,
  modelYear,
  modelYearInvalid = false,
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
  licensingCityInvalid?: boolean;
  licensingUf: string;
  licensingUfInvalid?: boolean;
  manufactureYear: string;
  manufactureYearInvalid?: boolean;
  modelYear: string;
  modelYearInvalid?: boolean;
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
      <FeatureField
        error={
          manufactureYearInvalid ? "Ano de fabricação é obrigatório" : undefined
        }
        label="Ano fabricação"
      >
        <FeatureInput
          className="credere-form-input"
          data-invalid={manufactureYearInvalid ? "true" : undefined}
          inputMode="numeric"
          maxLength={4}
          onChange={(event) => onManufactureYearChange(event.target.value)}
          placeholder="Ex.: 2023"
          value={manufactureYear}
        />
      </FeatureField>
      <FeatureField
        error={modelYearInvalid ? "Ano modelo é obrigatório" : undefined}
        label="Ano modelo"
      >
        <FeatureInput
          className="credere-form-input"
          data-invalid={modelYearInvalid ? "true" : undefined}
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
      <FeatureField
        error={
          licensingUfInvalid ? "UF de licenciamento é obrigatória" : undefined
        }
        label="UF de licenciamento"
      >
        <FeatureSelect
          ariaLabel="UF de licenciamento"
          className="credere-form-select"
          invalid={licensingUfInvalid}
          onChange={onLicensingUfChange}
          options={stateOptions}
          placeholder="Selecione a UF"
          searchable
          value={licensingUf}
        />
      </FeatureField>
      <FeatureField
        error={
          licensingCityInvalid
            ? "Cidade de licenciamento é obrigatória"
            : undefined
        }
        label="Cidade de licenciamento"
      >
        <FeatureSelect
          ariaLabel="Cidade de licenciamento"
          className="credere-form-select"
          disabled={!licensingUf}
          invalid={licensingCityInvalid}
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
