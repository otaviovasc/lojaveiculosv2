import { getCitiesByStateCode } from "@lojaveiculosv2/shared";
import { RefreshCw, Send } from "lucide-react";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
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
  isValidPreflightDocument,
  readApplicantRequirements,
} from "./applicantPreflight";
import {
  SimulationApplicantFields,
  SimulationTermsFields,
  SimulationVehicleFields,
} from "./SimulationFormFields";
import type {
  CredereFipeCandidate,
  CredereFipeResolution,
  CredereApplicantPreflightState,
  CredereRequiredFields,
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
  onGetRequiredFields: (input: {
    bankCodes?: readonly string[] | undefined;
    cpfCnpj: string;
  }) => Promise<CredereRequiredFields>;
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
  onGetRequiredFields,
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
  const [birthDate, setBirthDate] = useState("");
  const [hasCnh, setHasCnh] = useState<boolean | null>(null);
  const [income, setIncome] = useState<number | null>(null);
  const [vehicleValue, setVehicleValue] = useState<number | null>(
    prefill?.vehicleValueCents ? prefill.vehicleValueCents / 100 : null,
  );
  const [downPayment, setDownPayment] = useState<number | null>(null);
  const [documentationValue, setDocumentationValue] = useState<number | null>(
    null,
  );
  const [accessoryValue, setAccessoryValue] = useState<number | null>(null);
  const [insuranceValue, setInsuranceValue] = useState<number | null>(null);
  const [installments, setInstallments] = useState("all");
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
  const initialLicensingUf = prefill?.licensingUf?.trim().toUpperCase() ?? "";
  const [licensingCity, setLicensingCity] = useState(
    canonicalCity(initialLicensingUf, prefill?.licensingCity ?? ""),
  );
  const [licensingUf, setLicensingUf] = useState(initialLicensingUf);
  const [zeroKm, setZeroKm] = useState(prefill?.zeroKm ?? false);
  const [bankCodes, setBankCodes] = useState<readonly string[]>([]);
  const [consent, setConsent] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [preflightState, setPreflightState] =
    useState<CredereApplicantPreflightState>({ kind: "idle" });
  const preflightRequestRef = useRef("");
  const requirements =
    preflightState.kind === "ready"
      ? readApplicantRequirements(preflightState.result)
      : { supported: new Set<string>(), unsupported: [] as string[] };

  const runApplicantPreflight = async () => {
    if (!isValidPreflightDocument(cpfCnpj)) return;
    const requestKey = `${cpfCnpj.replace(/\D/g, "")}:${bankCodes.join(",")}`;
    preflightRequestRef.current = requestKey;
    setPreflightState({ kind: "loading" });
    try {
      const result = await onGetRequiredFields({
        ...(bankCodes.length ? { bankCodes } : {}),
        cpfCnpj,
      });
      if (preflightRequestRef.current === requestKey) {
        setPreflightState({ kind: "ready", result });
      }
    } catch (error) {
      if (preflightRequestRef.current === requestKey) {
        setPreflightState({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "Não foi possível conferir os campos exigidos.",
        });
      }
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const vehicleValueCents = Math.round((vehicleValue ?? 0) * 100);
    const downPaymentCents = Math.round((downPayment ?? 0) * 100);
    const manYear = Number(manufactureYear);
    const modYear = Number(modelYear);
    const fail = (message: string) => setValidationError(message);

    if (!name.trim()) return fail("Informe o nome do proponente.");
    if (!isValidPreflightDocument(cpfCnpj))
      return fail("Informe um CPF/CNPJ válido para consultar o Credere.");
    if (preflightState.kind !== "ready")
      return fail("Confira os dados exigidos pelo Credere antes de simular.");
    if (requirements.unsupported.length)
      return fail(
        "O Credere exige dados que esta tela ainda não envia. Não foi feita uma operação oficial.",
      );
    if (requirements.supported.has("birthDate") && !birthDate)
      return fail("Informe a data de nascimento exigida pelos bancos.");
    if (requirements.supported.has("hasCnh") && hasCnh === null)
      return fail("Informe se o proponente possui CNH.");
    if (requirements.supported.has("email") && !email.trim())
      return fail("Informe o e-mail exigido pelos bancos.");
    if (requirements.supported.has("monthlyIncomeCents") && !income)
      return fail("Informe a renda mensal exigida pelos bancos.");
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
        ...(birthDate ? { birthDate } : {}),
        ...(hasCnh !== null ? { hasCnh } : {}),
        name,
        cpfCnpj,
        phone,
        ...(email.trim() ? { email } : {}),
        ...(income && income > 0
          ? { monthlyIncomeCents: Math.round(income * 100) }
          : {}),
      },
      ...(accessoryValue && accessoryValue > 0
        ? { accessoryValueCents: Math.round(accessoryValue * 100) }
        : {}),
      consent: {
        acceptedTerms: true,
        acceptedAt: new Date().toISOString(),
        channel: prefill?.channel ?? "store_workspace",
        policyVersion: "v1",
      },
      ...(documentationValue && documentationValue > 0
        ? { documentationValueCents: Math.round(documentationValue * 100) }
        : {}),
      downPaymentCents,
      installments:
        installments === "all" ? [12, 24, 36, 48, 60] : [Number(installments)],
      ...(insuranceValue && insuranceValue > 0
        ? { insuranceValueCents: Math.round(insuranceValue * 100) }
        : {}),
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
    setBankCodes((previous) => {
      preflightRequestRef.current = "";
      setPreflightState({ kind: "idle" });
      return previous.includes(code)
        ? previous.filter((item) => item !== code)
        : [...previous, code];
    });

  const visibleError = validationError ?? submitError;

  return (
    <form className="credere-simulation-form" onSubmit={handleSubmit}>
      <FeatureFormSection
        description="Identificação e contato usados na consulta consentida."
        title="Proponente"
      >
        <SimulationApplicantFields
          birthDate={birthDate}
          cpfCnpj={cpfCnpj}
          email={email}
          hasCnh={hasCnh}
          income={income}
          name={name}
          onBirthDateChange={setBirthDate}
          onCpfCnpjBlur={() => void runApplicantPreflight()}
          onCpfCnpjChange={(value) => {
            setCpfCnpj(value);
            preflightRequestRef.current = "";
            setPreflightState({ kind: "idle" });
          }}
          onEmailChange={setEmail}
          onHasCnhChange={setHasCnh}
          onIncomeChange={currencyChange(setIncome)}
          onNameChange={setName}
          onPhoneChange={setPhone}
          phone={phone}
          requiredFields={requirements.supported}
        />
        <ApplicantPreflightStatus
          canCheck={isValidPreflightDocument(cpfCnpj)}
          onRetry={() => void runApplicantPreflight()}
          state={preflightState}
          unsupportedCount={requirements.unsupported.length}
        />
      </FeatureFormSection>

      <FeatureFormSection
        description="Defina valor, entrada e prazo desejado."
        title="Condições"
      >
        <SimulationTermsFields
          accessoryValue={accessoryValue}
          documentationValue={documentationValue}
          downPayment={downPayment}
          installments={installments}
          insuranceValue={insuranceValue}
          onAccessoryValueChange={currencyChange(setAccessoryValue)}
          onDocumentationValueChange={currencyChange(setDocumentationValue)}
          onDownPaymentChange={currencyChange(setDownPayment)}
          onInsuranceValueChange={currencyChange(setInsuranceValue)}
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
            onLicensingUfChange={(value) => {
              setLicensingUf(value);
              setLicensingCity("");
            }}
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

function ApplicantPreflightStatus({
  canCheck,
  onRetry,
  state,
  unsupportedCount,
}: {
  canCheck: boolean;
  onRetry: () => void;
  state: CredereApplicantPreflightState;
  unsupportedCount: number;
}) {
  const text =
    state.kind === "loading"
      ? "Conferindo os dados exigidos pelos bancos..."
      : state.kind === "error"
        ? state.message
        : state.kind === "ready" && unsupportedCount > 0
          ? "O provedor exige dados adicionais que esta tela ainda não envia. A simulação ficará bloqueada."
          : state.kind === "ready"
            ? state.result.missingFields.length
              ? `${state.result.missingFields.length} dado(s) adicional(is) solicitado(s) pelos bancos.`
              : state.result.applicantKnown
                ? "Cadastro localizado. Nenhum dado adicional foi solicitado."
                : "Dados mínimos conferidos para iniciar a simulação."
            : canCheck
              ? "Confira os campos exigidos antes de enviar a simulação."
              : "Informe um CPF/CNPJ válido para conferir os campos exigidos.";
  return (
    <div
      className={`credere-preflight credere-preflight--${state.kind}`}
      role={state.kind === "error" ? "alert" : "status"}
    >
      <p>{text}</p>
      {state.kind !== "loading" ? (
        <button disabled={!canCheck} onClick={onRetry} type="button">
          <RefreshCw aria-hidden="true" className="size-3.5" />
          {state.kind === "ready" ? "Conferir novamente" : "Conferir agora"}
        </button>
      ) : null}
    </div>
  );
}

function canonicalCity(uf: string, city: string) {
  const normalized = normalizeLocation(city);
  return (
    getCitiesByStateCode(uf).find(
      (candidate) => normalizeLocation(candidate) === normalized,
    ) ?? ""
  );
}

function normalizeLocation(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}
