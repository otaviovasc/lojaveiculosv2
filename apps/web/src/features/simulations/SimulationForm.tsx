import { useState, type ChangeEvent, type FormEvent } from "react";
import { Send } from "lucide-react";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import { FeatureFormSection } from "../../components/ui/FeatureForms";
import {
  formatBrazilianDocument,
  formatBrazilianPhone,
  parseCurrencyInput,
} from "../../lib/masks";
import { SimulationBankSelector } from "./SimulationBankSelector";
import { SimulationFipeResolver } from "./SimulationFipeResolver";
import {
  SimulationApplicantFields,
  SimulationTermsFields,
  SimulationVehicleFields,
} from "./SimulationFormFields";
import type {
  CredereFipeCandidate,
  CredereFipeResolution,
  CredereSimulationDraft,
  CredereUsableBank,
} from "./types";

export type SimulationPrefill = {
  applicantName?: string;
  channel?: string;
  credereVehicleModelId?: string;
  cpfCnpj?: string;
  email?: string;
  fipeCode?: string;
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
  onResolveFipe: (input: {
    fipeCode: string;
    modelYear: number;
    selectedModelId?: string;
    selectedMolicarCode?: string;
  }) => Promise<CredereFipeResolution>;
  onSubmit: (draft: CredereSimulationDraft) => void | Promise<void>;
  prefill?: SimulationPrefill | undefined;
  submitError: string | null;
};

export function SimulationForm({
  banks,
  isSubmitting,
  onResolveFipe,
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
  const [fipeCode, setFipeCode] = useState(prefill?.fipeCode ?? "");
  const [credereVehicleModelId, setCredereVehicleModelId] = useState(
    prefill?.credereVehicleModelId ?? "",
  );
  const [selectedFipeCandidate, setSelectedFipeCandidate] =
    useState<CredereFipeCandidate | null>(null);
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
    if (!fipeCode.trim() || !molicarCode.trim() || !credereVehicleModelId) {
      return fail(
        "Consulte a FIPE e confirme a versão Molicar antes de simular.",
      );
    }
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
        credereVehicleModelId,
        fipeCode,
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
    <form className="credere-simulation-form" onSubmit={handleSubmit}>
      <FeatureFormSection
        description="Identificação e contato usados na consulta consentida."
        title="Proponente"
      >
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
      </FeatureFormSection>

      <FeatureFormSection
        description="Defina valor, entrada e prazo desejado."
        title="Condições"
      >
        <SimulationTermsFields
          downPayment={downPayment}
          installments={installments}
          onDownPaymentChange={currencyChange(setDownPayment)}
          onInstallmentsChange={setInstallments}
          onVehicleValueChange={currencyChange(setVehicleValue)}
          vehicleValue={vehicleValue}
        />
      </FeatureFormSection>

      <FeatureFormSection
        description="Confirme a FIPE e escolha a versão Molicar exata antes do envio."
        title="Veículo"
      >
        <div className="grid gap-4">
          <SimulationVehicleFields
            licensingCity={licensingCity}
            licensingUf={licensingUf}
            manufactureYear={manufactureYear}
            modelYear={modelYear}
            molicarCode={molicarCode}
            onLicensingCityChange={setLicensingCity}
            onLicensingUfChange={setLicensingUf}
            onManufactureYearChange={setManufactureYear}
            onModelYearChange={(value) => {
              setModelYear(value);
              setSelectedFipeCandidate(null);
              setCredereVehicleModelId("");
              setMolicarCode("");
            }}
            onMolicarCodeChange={setMolicarCode}
            onZeroKmChange={setZeroKm}
            zeroKm={zeroKm}
          />
          <SimulationFipeResolver
            fipeCode={fipeCode}
            key={`${fipeCode}:${modelYear}`}
            modelYear={modelYear}
            onFipeCodeChange={setFipeCode}
            onResolve={onResolveFipe}
            onSelect={(candidate) => {
              setSelectedFipeCandidate(candidate);
              setCredereVehicleModelId(candidate?.modelId ?? "");
              setMolicarCode(candidate?.molicarCode ?? "");
            }}
            selected={selectedFipeCandidate}
          />
        </div>
      </FeatureFormSection>

      <FeatureFormSection
        description="A lista já respeita os bancos ativos e autorizados para esta loja."
        title="Instituições"
      >
        <SimulationBankSelector
          bankCodes={bankCodes}
          banks={banks}
          onToggleBank={toggleBank}
        />
      </FeatureFormSection>

      <label className="credere-consent">
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

      <div className="credere-submit-row">
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
