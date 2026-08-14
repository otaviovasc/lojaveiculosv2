import { useEffect, useRef, useState, type FormEvent } from "react";
import { CircleAlert } from "lucide-react";
import { FeatureFormSection } from "../../components/ui/FeatureForms";
import { formatBrazilianDocument, formatBrazilianPhone } from "../../lib/masks";
import { SimulationFipeResolver } from "./SimulationFipeResolver";
import { SimulationReviewStep } from "./SimulationReviewStep";
import {
  isValidPreflightDocument,
  readApplicantRequirements,
} from "./applicantPreflight";
import {
  SimulationApplicantFields,
  SimulationTermsFields,
  SimulationVehicleFields,
} from "./SimulationFormFields";
import {
  SimulationApplicantSource,
  SimulationVehicleSource,
  readLeadDocument,
  useSimulationSources,
} from "./SimulationSourceSelectors";
import {
  SimulationFormStepper,
  SimulationStepActions,
  nextSimulationStep,
  previousSimulationStep,
  type SimulationFormStep,
} from "./SimulationFormNavigation";
import { SimulationApplicantPreflightStatus } from "./SimulationApplicantPreflightStatus";
import {
  SimulationSummarySidebar,
  type SimulationSummaryChecklistItem,
} from "./SimulationSummarySidebar";
import { canonicalSimulationCity } from "./simulationLocation";
import { createCurrencyChange, toggleBankCode } from "./simulationFormSupport";
import { buildSimulationDraft } from "./simulationDraftBuilder";
import {
  simulationStepReadiness,
  type SimulationStepSnapshot,
} from "./simulationStepReadiness";
import { getApiErrorDisplay } from "../../lib/apiErrors";
import type { ProductCrmLead } from "../crm/productCrmTypes";
import type {
  InventoryCatalogSnapshot,
  InventoryListingSummary,
} from "../inventory/model/types";
import type {
  CredereFipeCandidate,
  CredereApplicantPreflightState,
} from "./types";
import type { SimulationFormProps } from "./SimulationForm.types";
import "../../styles/credere-form.css";
export type { SimulationPrefill } from "./SimulationForm.types";

export function SimulationForm({
  banks,
  isSubmitting,
  onGetRequiredFields,
  onResolveFipe,
  onSubmit,
  onSummaryChange,
  onToast,
  prefill,
  submitError,
}: SimulationFormProps) {
  const sources = useSimulationSources();
  const [step, setStep] = useState<SimulationFormStep>("vehicle");
  const [applicantSource, setApplicantSource] = useState<"existing" | "new">(
    prefill?.leadId ? "existing" : "new",
  );
  const [vehicleSource, setVehicleSource] = useState<"catalog" | "stock">(
    "stock",
  );
  const [leadId, setLeadId] = useState(prefill?.leadId ?? "");
  const [listingId, setListingId] = useState(prefill?.listingId ?? "");
  const [unitId, setUnitId] = useState(prefill?.unitId ?? "");
  const [catalog, setCatalog] = useState<InventoryCatalogSnapshot | null>(null);
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
    canonicalSimulationCity(initialLicensingUf, prefill?.licensingCity ?? ""),
  );
  const [licensingUf, setLicensingUf] = useState(initialLicensingUf);
  const [zeroKm, setZeroKm] = useState(prefill?.zeroKm ?? false);
  const [bankCodes, setBankCodes] = useState<readonly string[]>(() =>
    banks.map((bank) => bank.code),
  );
  const [consent, setConsent] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [preflightState, setPreflightState] =
    useState<CredereApplicantPreflightState>({ kind: "idle" });
  const [preflightErrorId, setPreflightErrorId] = useState<string | null>(null);
  const preflightRequestRef = useRef("");
  const requirements =
    preflightState.kind === "ready"
      ? readApplicantRequirements(preflightState.result)
      : { supported: new Set<string>(), unsupported: [] as string[] };

  const runApplicantPreflight = async () => {
    if (!isValidPreflightDocument(cpfCnpj)) return;
    const requestKey = `${cpfCnpj.replace(/\D/g, "")}:${bankCodes.join(",")}`;
    preflightRequestRef.current = requestKey;
    setPreflightErrorId(null);
    setPreflightState({ kind: "loading" });
    try {
      const result = await onGetRequiredFields({
        bankCodes,
        cpfCnpj,
      });
      if (preflightRequestRef.current === requestKey) {
        const applicant = result.applicant;
        if (applicant) {
          setName((current) => current.trim() || applicant.name || "");
          setPhone((current) =>
            current.replace(/\D/g, "")
              ? current
              : formatBrazilianPhone(applicant.phone ?? ""),
          );
          setEmail((current) => current.trim() || applicant.email || "");
          setBirthDate((current) => current || applicant.birthDate || "");
          setHasCnh((current) => current ?? applicant.hasCnh);
          setIncome(
            (current) =>
              current ??
              (applicant.monthlyIncomeCents == null
                ? null
                : applicant.monthlyIncomeCents / 100),
          );
        }
        setPreflightState({ kind: "ready", result });
      }
    } catch (error) {
      if (preflightRequestRef.current === requestKey) {
        const display = getApiErrorDisplay(
          error,
          "Não foi possível conferir os campos exigidos.",
        );
        setPreflightErrorId(
          "requestId" in display ? (display.requestId ?? null) : null,
        );
        setPreflightState({ kind: "error", message: display.message });
      }
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = buildSimulationDraft({
      accessoryValue,
      bankCodes,
      birthDate,
      channel: prefill?.channel ?? "store_workspace",
      consent,
      cpfCnpj,
      credereVehicleModelId,
      documentationValue,
      downPayment,
      email,
      fipeCode,
      hasCnh,
      income,
      installments,
      insuranceValue,
      leadId,
      licensingCity,
      licensingUf,
      listingId,
      manufactureYear,
      modelYear,
      molicarCode,
      name,
      phone,
      preflightReady: preflightState.kind === "ready",
      requiredFields: requirements.supported,
      unitId,
      unsupportedFieldCount: requirements.unsupported.length,
      vehicleValue,
      zeroKm,
    });
    if (result.error !== null) return setValidationError(result.error);
    setValidationError(null);
    void onSubmit(result.draft);
  };

  const toggleBank = (code: string) =>
    setBankCodes((previous) => {
      preflightRequestRef.current = "";
      setPreflightState({ kind: "idle" });
      setPreflightErrorId(null);
      return toggleBankCode(previous, code);
    });

  const selectListing = (item: InventoryListingSummary | null) => {
    if (!item) {
      setListingId("");
      setUnitId("");
      return;
    }
    const listing = item.listing;
    setListingId(listing.id);
    setUnitId(item.primaryUnit?.id ?? item.units[0]?.id ?? "");
    setCatalog(listing.catalog);
    setVehicleValue(
      listing.priceCents == null ? null : listing.priceCents / 100,
    );
    setManufactureYear(
      listing.manufactureYear == null ? "" : String(listing.manufactureYear),
    );
    setModelYear(listing.modelYear == null ? "" : String(listing.modelYear));
    setFipeCode(listing.catalog?.fipeCode ?? "");
    setSelectedFipeCandidate(null);
    setCredereVehicleModelId("");
    setMolicarCode("");
  };

  const selectCatalog = (next: InventoryCatalogSnapshot | null) => {
    setCatalog(next);
    setListingId("");
    setUnitId("");
    setFipeCode(next?.fipeCode ?? "");
    if (next?.modelYear) setModelYear(String(next.modelYear));
    if (next?.priceCents) setVehicleValue(next.priceCents / 100);
    setSelectedFipeCandidate(null);
    setCredereVehicleModelId("");
    setMolicarCode("");
  };

  const selectLead = (lead: ProductCrmLead | null) => {
    setLeadId(lead?.id ?? "");
    if (!lead) return;
    setName(lead.buyerName ?? "");
    setPhone(formatBrazilianPhone(lead.buyerPhone ?? ""));
    setEmail(lead.buyerEmail ?? "");
    const document = readLeadDocument(lead);
    if (document) setCpfCnpj(formatBrazilianDocument(document));
    if (lead.listingId) {
      setListingId(lead.listingId);
      const item = sources.inventory.find(
        (candidate) => candidate.listing.id === lead.listingId,
      );
      if (item) selectListing(item);
    }
    preflightRequestRef.current = "";
    setPreflightState({ kind: "idle" });
    setPreflightErrorId(null);
  };

  const continueStep = () => {
    const readiness = simulationStepReadiness(step, snapshot);
    if (!readiness.ready) return setValidationError(readiness.reason);
    setStep(nextSimulationStep(step));
    setValidationError(null);
  };

  const previousStep = () => {
    setStep(previousSimulationStep(step));
    setValidationError(null);
  };

  const snapshot: SimulationStepSnapshot = {
    cpfCnpj,
    credereVehicleModelId,
    downPayment,
    fipeCode,
    licensingCity,
    licensingUf,
    manufactureYear,
    modelYear,
    molicarCode,
    name,
    phone,
    preflightReady: preflightState.kind === "ready",
    vehicleValue,
  };
  const currentReadiness = simulationStepReadiness(step, snapshot);
  const checklist: SimulationSummaryChecklistItem[] = [
    {
      complete: simulationStepReadiness("vehicle", snapshot).ready,
      label: "Veículo e versão confirmados",
    },
    {
      complete: simulationStepReadiness("applicant", snapshot).ready,
      label: "Proponente conferido no Credere",
    },
    {
      complete: simulationStepReadiness("terms", snapshot).ready,
      label: "Condições definidas",
    },
    { complete: consent, label: "Consentimento registrado" },
  ];
  const versionLabel = selectedFipeCandidate
    ? selectedFipeCandidate.version || selectedFipeCandidate.name
    : null;

  useEffect(() => {
    onSummaryChange?.({
      applicantName: name,
      bankCount: bankCodes.length,
      checklist,
      downPayment,
      fipeCode,
      licensingCity,
      licensingUf,
      manufactureYear,
      modelYear,
      molicarCode,
      preflightReady: preflightState.kind === "ready",
      vehicleName: catalog?.modelName ?? null,
      vehicleValue,
      versionLabel,
    });
  }, [
    name,
    bankCodes.length,
    checklist,
    downPayment,
    fipeCode,
    licensingCity,
    licensingUf,
    manufactureYear,
    modelYear,
    molicarCode,
    preflightState.kind,
    catalog?.modelName,
    vehicleValue,
    versionLabel,
    onSummaryChange,
  ]);

  const visibleError = validationError ?? submitError;

  return (
    <form className="credere-form" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-6">
        <SimulationFormStepper onChange={setStep} step={step} />

        {step === "vehicle" ? (
          <FeatureFormSection
            className="credere-form-section"
            description="Selecione um veículo do estoque ou navegue pelo mesmo catálogo FIPE usado no cadastro."
            title="Veículo"
          >
            <div className="grid gap-5">
              <SimulationVehicleSource
                catalog={catalog}
                listingId={listingId}
                manufactureYear={manufactureYear}
                onCatalogChange={selectCatalog}
                onManufactureYearChange={setManufactureYear}
                onSelectListing={selectListing}
                onSourceChange={(value) => {
                  setVehicleSource(value);
                  if (value === "catalog") {
                    setListingId("");
                    setUnitId("");
                  }
                }}
                onToast={onToast ?? (() => {})}
                onYearChange={(year) => {
                  setModelYear(year == null ? "" : String(year));
                  setSelectedFipeCandidate(null);
                  setCredereVehicleModelId("");
                  setMolicarCode("");
                }}
                source={vehicleSource}
                sources={sources}
              />
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
                  if (candidate && onToast) {
                    onToast(
                      `Versão "${candidate.version || candidate.name}" confirmada na Credere.`,
                    );
                  }
                }}
                selected={selectedFipeCandidate}
              />
            </div>
          </FeatureFormSection>
        ) : null}

        {step === "applicant" ? (
          <FeatureFormSection
            className="credere-form-section"
            description="Selecione um lead do CRM ou informe um novo proponente. O Credere completa somente campos vazios."
            title="Proponente"
          >
            <div className="grid gap-5">
              <SimulationApplicantSource
                leadId={leadId}
                onSelect={selectLead}
                onSourceChange={(value) => {
                  setApplicantSource(value);
                  if (value === "new") setLeadId("");
                }}
                source={applicantSource}
                sources={sources}
              />
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
                  setPreflightErrorId(null);
                }}
                onEmailChange={setEmail}
                onHasCnhChange={setHasCnh}
                onIncomeChange={createCurrencyChange(setIncome)}
                onNameChange={setName}
                onPhoneChange={setPhone}
                phone={phone}
                requiredFields={requirements.supported}
              />
              <SimulationApplicantPreflightStatus
                canCheck={isValidPreflightDocument(cpfCnpj)}
                onRetry={() => void runApplicantPreflight()}
                requestId={preflightErrorId}
                state={preflightState}
                unsupportedCount={requirements.unsupported.length}
              />
            </div>
          </FeatureFormSection>
        ) : null}

        {step === "terms" ? (
          <FeatureFormSection
            className="credere-form-section"
            description="Defina valor, entrada e prazos desejados."
            title="Condições"
          >
            <SimulationTermsFields
              accessoryValue={accessoryValue}
              documentationValue={documentationValue}
              downPayment={downPayment}
              installments={installments}
              insuranceValue={insuranceValue}
              onAccessoryValueChange={createCurrencyChange(setAccessoryValue)}
              onDocumentationValueChange={createCurrencyChange(
                setDocumentationValue,
              )}
              onDownPaymentChange={createCurrencyChange(setDownPayment)}
              onInsuranceValueChange={createCurrencyChange(setInsuranceValue)}
              onInstallmentsChange={setInstallments}
              onVehicleValueChange={createCurrencyChange(setVehicleValue)}
              vehicleValue={vehicleValue}
            />
          </FeatureFormSection>
        ) : null}

        {step === "review" ? (
          <SimulationReviewStep
            applicantName={name}
            bankCodes={bankCodes}
            banks={banks}
            consent={consent}
            downPayment={downPayment}
            fipeCode={fipeCode}
            installments={installments}
            licensingCity={licensingCity}
            licensingUf={licensingUf}
            manufactureYear={manufactureYear}
            modelYear={modelYear}
            molicarCode={molicarCode}
            onConsentChange={setConsent}
            onToggleBank={toggleBank}
            preflightReady={preflightState.kind === "ready"}
            vehicleName={catalog?.modelName ?? null}
            vehicleValue={vehicleValue}
            versionLabel={versionLabel}
            zeroKm={zeroKm}
          />
        ) : null}

        {visibleError ? (
          <p className="credere-form-error" role="alert">
            <CircleAlert aria-hidden="true" />
            {visibleError}
          </p>
        ) : null}

        <SimulationStepActions
          isLast={step === "review"}
          isSubmitting={isSubmitting}
          nextDisabled={!currentReadiness.ready}
          nextHint={currentReadiness.ready ? null : currentReadiness.reason}
          onBack={step === "vehicle" ? null : previousStep}
          onNext={step === "review" ? null : continueStep}
          step={step}
        />
      </div>
    </form>
  );
}
