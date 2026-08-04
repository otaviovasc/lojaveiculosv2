import { useState, type ChangeEvent, type FormEvent } from "react";
import { Send } from "lucide-react";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import {
  formatBrazilianDocument,
  formatBrazilianPhone,
  parseCurrencyInput,
} from "../../lib/masks";
import { SimulationBankSelector } from "./SimulationBankSelector";
import {
  SimulationApplicantFields,
  SimulationTermsFields,
  SimulationVehicleFields,
} from "./SimulationFormFields";
import type { CredereSimulationDraft, CredereUsableBank } from "./types";

export type SimulationPrefill = {
  applicantName?: string;
  channel?: string;
  credereVehicleModelId?: string;
  cpfCnpj?: string;
  email?: string;
  leadId?: string;
  listingId?: string;
  licensingCity?: string;
  licensingUf?: string;
  manufactureYear?: number;
  modelYear?: number;
  molicarCode?: string;
  phone?: string;
  unitId?: string;
  vehicleValueCents?: number;
  zeroKm?: boolean;
};

type SimulationFormProps = {
  banks: readonly CredereUsableBank[];
  isSubmitting: boolean;
  onSubmit: (draft: CredereSimulationDraft) => void | Promise<void>;
  prefill?: SimulationPrefill | undefined;
  submitError: string | null;
};

export function SimulationForm({
  banks,
  isSubmitting,
  onSubmit,
  prefill,
  submitError,
}: SimulationFormProps) {
  const [name, setName] = useState(prefill?.applicantName ?? "");
  const [cpfCnpj, setCpfCnpj] = useState(
    formatBrazilianDocument(prefill?.cpfCnpj ?? ""),
  );
  const [phone, setPhone] = useState(
    formatBrazilianPhone(prefill?.phone ?? ""),
  );
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [income, setIncome] = useState<number | null>(null);
  const [vehicleValue, setVehicleValue] = useState<number | null>(
    prefill?.vehicleValueCents ? prefill.vehicleValueCents / 100 : null,
  );
  const [downPayment, setDownPayment] = useState<number | null>(null);
  const [installments, setInstallments] = useState("48");
  const [manufactureYear, setManufactureYear] = useState(
    prefill?.manufactureYear ? String(prefill.manufactureYear) : "",
  );
  const [modelYear, setModelYear] = useState(
    prefill?.modelYear ? String(prefill.modelYear) : "",
  );
  const [molicarCode, setMolicarCode] = useState(prefill?.molicarCode ?? "");
  const [licensingCity, setLicensingCity] = useState(
    prefill?.licensingCity ?? "",
  );
  const [licensingUf, setLicensingUf] = useState(prefill?.licensingUf ?? "");
  const [zeroKm, setZeroKm] = useState(prefill?.zeroKm ?? false);
  const [bankCodes, setBankCodes] = useState<readonly string[]>([]);
  const [consent, setConsent] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const vehicleValueCents = Math.round((vehicleValue ?? 0) * 100);
    const downPaymentCents = Math.round((downPayment ?? 0) * 100);
    const manYear = Number(manufactureYear);
    const modYear = Number(modelYear);
    const fail = (message: string) => setValidationError(message);

    if (!name.trim()) return fail("Informe o nome do proponente.");
    if (!cpfCnpj.replace(/\D/g, ""))
      return fail("Informe o CPF/CNPJ do proponente.");
    if (!phone.replace(/\D/g, ""))
      return fail("Informe o telefone do proponente.");
    if (vehicleValueCents <= 0) return fail("Informe o valor do veículo.");
    if (downPaymentCents <= 0)
      return fail("Informe um valor de entrada válido.");
    if (downPaymentCents >= vehicleValueCents)
      return fail("A entrada deve ser menor que o valor do veículo.");
    if (!manYear || !modYear)
      return fail("Informe os anos de fabricação e modelo do veículo.");
    if (!molicarCode.trim()) return fail("Informe o código Molicar.");
    if (!licensingUf.trim()) return fail("Informe a UF de licenciamento.");
    if (!licensingCity.trim())
      return fail("Informe a cidade de licenciamento.");
    if (!consent)
      return fail(
        "Confirme o consentimento do proponente para consultar os bancos.",
      );

    setValidationError(null);
    void onSubmit({
      applicant: {
        name,
        cpfCnpj,
        phone,
        ...(email.trim() ? { email } : {}),
        ...(income && income > 0
          ? { monthlyIncomeCents: Math.round(income * 100) }
          : {}),
      },
      consent: {
        acceptedTerms: true,
        acceptedAt: new Date().toISOString(),
        channel: prefill?.channel ?? "store_workspace",
        policyVersion: "v1",
      },
      downPaymentCents,
      installments: Number(installments),
      ...(prefill?.leadId ? { leadId: prefill.leadId } : {}),
      ...(prefill?.listingId ? { listingId: prefill.listingId } : {}),
      ...(prefill?.unitId ? { unitId: prefill.unitId } : {}),
      ...(bankCodes.length ? { requestedBankCodes: [...bankCodes] } : {}),
      vehicle: {
        ...(prefill?.credereVehicleModelId?.trim()
          ? { credereVehicleModelId: prefill.credereVehicleModelId.trim() }
          : {}),
        priceCents: vehicleValueCents,
        manufactureYear: manYear,
        modelYear: modYear,
        licensingCity,
        licensingUf: licensingUf.trim().toUpperCase(),
        molicarCode,
        zeroKm,
      },
    });
  };

  const currencyChange =
    (setter: (value: number | null) => void) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const parsed = parseCurrencyInput(event.target.value);
      setter(parsed ? Number(parsed) : null);
    };

  const toggleBank = (code: string) =>
    setBankCodes((previous) =>
      previous.includes(code)
        ? previous.filter((item) => item !== code)
        : [...previous, code],
    );

  const visibleError = validationError ?? submitError;

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <SimulationApplicantFields
        cpfCnpj={cpfCnpj}
        email={email}
        income={income}
        name={name}
        onCpfCnpjChange={setCpfCnpj}
        onEmailChange={setEmail}
        onIncomeChange={currencyChange(setIncome)}
        onNameChange={setName}
        onPhoneChange={setPhone}
        phone={phone}
      />

      <SimulationTermsFields
        downPayment={downPayment}
        installments={installments}
        onDownPaymentChange={currencyChange(setDownPayment)}
        onInstallmentsChange={setInstallments}
        onVehicleValueChange={currencyChange(setVehicleValue)}
        vehicleValue={vehicleValue}
      />

      <SimulationVehicleFields
        licensingCity={licensingCity}
        licensingUf={licensingUf}
        manufactureYear={manufactureYear}
        modelYear={modelYear}
        molicarCode={molicarCode}
        onLicensingCityChange={setLicensingCity}
        onLicensingUfChange={setLicensingUf}
        onManufactureYearChange={setManufactureYear}
        onModelYearChange={setModelYear}
        onMolicarCodeChange={setMolicarCode}
        onZeroKmChange={setZeroKm}
        zeroKm={zeroKm}
      />

      <SimulationBankSelector
        bankCodes={bankCodes}
        banks={banks}
        onToggleBank={toggleBank}
      />

      <label className="flex items-start gap-2 text-xs font-bold text-app-text">
        <input
          checked={consent}
          className="mt-0.5 size-4"
          onChange={(event) => setConsent(event.target.checked)}
          type="checkbox"
        />
        O proponente autorizou expressamente a consulta de seus dados junto aos
        bancos parceiros para esta simulação.
      </label>

      {visibleError ? (
        <p className="text-xs font-semibold text-danger" role="alert">
          {visibleError}
        </p>
      ) : null}

      <div>
        <FeatureActionButton
          icon={Send}
          isBusy={isSubmitting}
          label={isSubmitting ? "Enviando simulação" : "Simular no Credere"}
          type="submit"
          variant="primary"
        />
      </div>
    </form>
  );
}
