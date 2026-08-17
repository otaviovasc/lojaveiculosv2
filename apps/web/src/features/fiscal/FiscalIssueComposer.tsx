import { ArrowLeft, ArrowRight, Check, ReceiptText, Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import "../../styles/fiscal-issue.css";
import { FeatureTabs } from "../../components/ui/FeatureTabs";
import {
  FeatureActionButton,
  FeatureSection,
} from "../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { createFinanceApi, type FinanceApi } from "../finance/apiClient";
import { createFinanceApiOptions } from "../finance/runtimeApi";
import {
  createInventoryApi,
  type InventoryApi,
} from "../inventory/api/apiClient";
import { createInventoryApiOptions } from "../inventory/api/inventoryRuntimeApi";
import { createSalesApi, type SalesApi } from "../sales/apiClient";
import { createSalesApiOptions } from "../sales/runtimeApi";
import type { SaleRecord } from "../sales/types";
import type { FinanceEntry } from "../finance/types";
import type { FiscalApi } from "./apiClient";
import {
  amountFromInput,
  applyEntryToIssueDraft,
  applySaleToIssueDraft,
  computeIssueTotalCents,
  createEmptyIssueDraft,
  formatBrl,
  type FiscalIssueDraft,
  type IssueStep,
} from "./fiscalIssueModel";
import {
  buildIssueDocumentInput,
  createNfseTemplateVariables,
  validateIssueDraft,
} from "./fiscalIssuePayload";
import {
  FiscalIssueReviewDialog,
  type FiscalIssueReviewSummary,
} from "./FiscalIssueReviewDialog";
import { FiscalItemsStep } from "./FiscalItemsStep";
import { FiscalOriginStep, type OriginListStatus } from "./FiscalOriginStep";
import { FiscalRecipientStep } from "./FiscalRecipientStep";
import type {
  FiscalDocument,
  FiscalRecipient,
  FiscalTemplate,
  VehicleNfeVehicle,
} from "./types";

export type FiscalIssueComposerProps = {
  api: FiscalApi;
  disabled?: boolean;
  financeApi?: Pick<FinanceApi, "listAllEntries">;
  initialDraft?: FiscalIssueDraft | null;
  inventoryApi?: Pick<InventoryApi, "getListing">;
  onError?: (message: string) => void;
  onIssued?: () => Promise<void> | void;
  salesApi?: Pick<SalesApi, "list">;
};

const stepOptions: ReadonlyArray<{
  label: string;
  name: string;
  value: IssueStep;
}> = [
  { label: "1. Origem", name: "Origem", value: "origin" },
  { label: "2. Destinatário", name: "Destinatário", value: "recipient" },
  { label: "3. Itens e veículo", name: "Itens e veículo", value: "items" },
];

export function FiscalIssueComposer({
  api,
  disabled = false,
  financeApi,
  initialDraft = null,
  inventoryApi,
  onError,
  onIssued,
  salesApi,
}: FiscalIssueComposerProps) {
  const [draft, setDraft] = useState<FiscalIssueDraft>(() =>
    createEmptyIssueDraft("nfe"),
  );
  const [step, setStep] = useState<IssueStep>("origin");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [issuedDocument, setIssuedDocument] = useState<FiscalDocument | null>(
    null,
  );
  const [review, setReview] = useState<FiscalIssueReviewSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewUnresolved, setPreviewUnresolved] = useState<readonly string[]>(
    [],
  );
  const [recipients, setRecipients] = useState<FiscalRecipient[]>([]);
  const [templates, setTemplates] = useState<FiscalTemplate[]>([]);
  const [sales, setSales] = useState<readonly SaleRecord[]>([]);
  const [salesStatus, setSalesStatus] = useState<OriginListStatus>("idle");
  const [entries, setEntries] = useState<readonly FinanceEntry[]>([]);
  const [entriesStatus, setEntriesStatus] = useState<OriginListStatus>("idle");
  const runtimeApisRef = useRef<{
    finance?: Pick<FinanceApi, "listAllEntries">;
    inventory?: Pick<InventoryApi, "getListing">;
    sales?: Pick<SalesApi, "list">;
  }>({});

  useEffect(() => {
    if (!initialDraft) return;
    setDraft(initialDraft);
    setStep("origin");
    setErrors({});
    setFormError(null);
    setIssuedDocument(null);
  }, [initialDraft]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([api.listRecipients(), api.listTemplates()])
      .then(([recipientList, templateList]) => {
        if (cancelled) return;
        setRecipients(recipientList);
        setTemplates(templateList);
      })
      .catch((error) => reportError(error));
    return () => {
      cancelled = true;
    };
  }, [api]);

  useEffect(() => {
    if (draft.origin !== "sale" || salesStatus !== "idle") return;
    setSalesStatus("loading");
    void resolveSalesApi()
      .then((client) => client.list({ status: "all" }))
      .then((list) => {
        setSales(list);
        setSalesStatus("ready");
      })
      .catch(() => setSalesStatus("error"));
  }, [draft.origin, salesStatus]);

  useEffect(() => {
    if (draft.origin !== "entry" || entriesStatus !== "idle") return;
    setEntriesStatus("loading");
    void resolveFinanceApi()
      .then((client) => client.listAllEntries("expense"))
      .then((list) => {
        setEntries(list);
        setEntriesStatus("ready");
      })
      .catch(() => setEntriesStatus("error"));
  }, [draft.origin, entriesStatus]);

  const stepIndex = stepOptions.findIndex((option) => option.value === step);
  const isLastStep = stepIndex === stepOptions.length - 1;

  function patchDraft(patch: Partial<FiscalIssueDraft>) {
    setDraft((current) => {
      const next = { ...current, ...patch };
      if (patch.kind && patch.kind !== current.kind) {
        return { ...createEmptyIssueDraft(patch.kind), kind: patch.kind };
      }
      if (patch.origin && patch.origin !== current.origin) {
        next.saleId = null;
        next.entryId = null;
        next.externalReference = "";
        next.items = createEmptyIssueDraft(next.kind).items;
        next.vehicle = {};
        next.payments = [];
      }
      return next;
    });
    setErrors({});
    setFormError(null);
    setIssuedDocument(null);
  }

  function selectSale(sale: SaleRecord) {
    setDraft((current) => applySaleToIssueDraft(current, sale));
    setErrors({});
    if (sale.listingId) void enrichVehicleFromListing(sale);
  }

  // Best-effort enrichment: the sale listing snapshot only carries
  // title/plate/color/years, so the authoritative listing fills the rest
  // (fuel, mileage, chassis from the sold unit). Fields stay editable.
  async function enrichVehicleFromListing(sale: SaleRecord) {
    const listingId = sale.listingId;
    if (!listingId) return;
    try {
      const client = await resolveInventoryApi();
      const detail = await client.getListing(listingId);
      const unit =
        detail.units.find((item) => item.id === sale.unitId) ?? detail.units[0];
      const enrichment: VehicleNfeVehicle = {};
      if (unit?.vin) enrichment.chassis = unit.vin;
      if (unit?.colorName) enrichment.color = unit.colorName;
      if (unit?.plate) enrichment.plate = unit.plate;
      if (detail.listing.fuelType)
        enrichment.fuelType = detail.listing.fuelType;
      if (detail.listing.manufactureYear)
        enrichment.manufactureYear = detail.listing.manufactureYear;
      if (detail.listing.modelYear)
        enrichment.modelYear = detail.listing.modelYear;
      if (detail.listing.mileageKm)
        enrichment.odometer = detail.listing.mileageKm;
      setDraft((current) =>
        current.saleId !== sale.id
          ? current
          : {
              ...current,
              vehicle: {
                ...current.vehicle,
                ...enrichment,
                id: current.vehicle.id || detail.listing.id,
              },
            },
      );
    } catch {
      // The listing fetch is a convenience fill; the vehicle block remains
      // fully editable when inventory data is unavailable.
    }
  }

  function selectEntry(entry: FinanceEntry) {
    setDraft((current) => applyEntryToIssueDraft(current, entry));
    setErrors({});
  }

  async function resolveSalesApi(): Promise<Pick<SalesApi, "list">> {
    if (salesApi) return salesApi;
    if (!runtimeApisRef.current.sales) {
      runtimeApisRef.current.sales = createSalesApi(
        await createSalesApiOptions(),
      );
    }
    return runtimeApisRef.current.sales;
  }

  async function resolveInventoryApi(): Promise<
    Pick<InventoryApi, "getListing">
  > {
    if (inventoryApi) return inventoryApi;
    if (!runtimeApisRef.current.inventory) {
      runtimeApisRef.current.inventory = createInventoryApi(
        await createInventoryApiOptions(),
      );
    }
    return runtimeApisRef.current.inventory;
  }

  async function resolveFinanceApi(): Promise<
    Pick<FinanceApi, "listAllEntries">
  > {
    if (financeApi) return financeApi;
    if (!runtimeApisRef.current.finance) {
      runtimeApisRef.current.finance = createFinanceApi(
        await createFinanceApiOptions(),
      );
    }
    return runtimeApisRef.current.finance;
  }

  async function previewTemplate() {
    if (!draft.nfse.templateId) return;
    setIsPreviewing(true);
    try {
      const amount = amountFromInput(draft.nfse.grossAmount);
      const recipient = recipients.find(
        (item) => item.id === draft.nfse.recipientId,
      );
      const result = await api.previewTemplate({
        templateId: draft.nfse.templateId,
        variables: createNfseTemplateVariables(
          amount,
          draft.nfse.competence,
          recipient,
        ),
      });
      setPreview(result.renderedDescription);
      setPreviewUnresolved(result.unresolvedVariables);
    } catch (error) {
      reportError(error);
    } finally {
      setIsPreviewing(false);
    }
  }

  function requestReview() {
    const result = validateIssueDraft(draft);
    setErrors(result.errors);
    if (result.firstStep) {
      setStep(result.firstStep);
      setFormError(Object.values(result.errors)[0] ?? null);
      return;
    }
    setFormError(null);
    setReview(createReviewSummary(draft));
  }

  async function confirmIssue() {
    setBusy(true);
    try {
      const document = await api.issueDocument(buildIssueDocumentInput(draft));
      setReview(null);
      setIssuedDocument(document);
      setDraft(createEmptyIssueDraft(draft.kind));
      setStep("origin");
      setErrors({});
      setPreview(null);
      await onIssued?.();
    } catch (error) {
      setReview(null);
      reportError(error);
    } finally {
      setBusy(false);
    }
  }

  function reportError(error: unknown) {
    const message = formatApiErrorDisplay(
      error,
      "Não foi possível concluir a operação fiscal.",
    );
    setFormError(message);
    onError?.(message);
  }

  // A visually hidden copy of the full "1. Origem"-style label keeps each
  // tab's accessible name stable while the visual stepper shows a numbered
  // badge that swaps to a check on completed steps.
  const renderedSteps = useMemo(
    () =>
      stepOptions.map((option, index) => ({
        label: (
          <span
            className={
              index < stepIndex
                ? "fiscal-step-label is-done"
                : "fiscal-step-label"
            }
          >
            <span className="sr-only">{option.label}</span>
            <span aria-hidden="true" className="fiscal-step-index">
              <span className="fiscal-step-num">{index + 1}.</span>
              <Check className="fiscal-step-check" />
            </span>
            <span aria-hidden="true" className="fiscal-step-text">
              {option.name}
            </span>
          </span>
        ),
        value: option.value,
      })),
    [stepIndex],
  );

  const progressPercent = ((stepIndex + 1) / stepOptions.length) * 100;

  return (
    <FeatureSection
      className="feature-panel fiscal-issue"
      padding="comfortable"
    >
      <header className="fiscal-issue-hero">
        <span aria-hidden="true" className="fiscal-issue-blob" />
        <ReceiptText aria-hidden="true" className="fiscal-issue-watermark" />
        <p className="fiscal-issue-eyebrow">
          <ReceiptText aria-hidden="true" className="size-3.5" />
          Emissão fiscal
        </p>
        <h3 className="fiscal-issue-title">Emitir documento</h3>
        <p className="fiscal-issue-subtitle">
          Monte a nota a partir de uma operação real da loja e revise antes de
          transmitir ao provedor.
        </p>
      </header>

      <div className="grid gap-5">
        <div className="fiscal-stepper">
          <FeatureTabs<IssueStep>
            activeClassName="fiscal-step--active"
            ariaLabel="Etapas da emissão"
            className="fiscal-stepper-tabs"
            onChange={setStep}
            optionClassName="fiscal-step"
            options={renderedSteps}
            value={step}
          />
          <div aria-hidden="true" className="fiscal-stepper-progress">
            <span
              className="fiscal-stepper-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {formError ? <FeatureAlert>{formError}</FeatureAlert> : null}
        {issuedDocument ? (
          <FeatureAlert tone="success">
            Emissão registrada no provedor com status {issuedDocument.status}.
            Acompanhe o andamento na lista de documentos.
          </FeatureAlert>
        ) : null}

        {step === "origin" ? (
          <div className="fiscal-pane">
            <div className="fiscal-pane-header">
              <p className="fiscal-pane-kicker">Etapa 01 de 03 · Origem</p>
              <p className="fiscal-pane-meta">
                {draft.kind === "nfe" ? "NF-e (produto)" : "NFS-e (serviço)"}
              </p>
            </div>
            <FiscalOriginStep
              disabled={disabled || busy}
              draft={draft}
              entries={entries}
              entriesStatus={entriesStatus}
              onChange={patchDraft}
              onSelectEntry={selectEntry}
              onSelectSale={selectSale}
              sales={sales}
              salesStatus={salesStatus}
            />
          </div>
        ) : null}

        {step === "recipient" ? (
          <div className="fiscal-pane">
            <div className="fiscal-pane-header">
              <p className="fiscal-pane-kicker">
                Etapa 02 de 03 · Destinatário
              </p>
              <p className="fiscal-pane-meta">
                {draft.kind === "nfe" ? "NF-e (produto)" : "NFS-e (serviço)"}
              </p>
            </div>
            <FiscalRecipientStep
              disabled={disabled || busy}
              draft={draft}
              errors={errors}
              isPreviewing={isPreviewing}
              onChange={(patch) =>
                setDraft((current) => ({
                  ...current,
                  recipient: { ...current.recipient, ...patch },
                }))
              }
              onNfseChange={(patch) =>
                setDraft((current) => ({
                  ...current,
                  nfse: { ...current.nfse, ...patch },
                }))
              }
              onPreview={() => void previewTemplate()}
              preview={preview}
              previewUnresolved={previewUnresolved}
              recipients={recipients}
              templates={templates}
            />
          </div>
        ) : null}

        {step === "items" ? (
          <div className="fiscal-pane">
            <div className="fiscal-pane-header">
              <p className="fiscal-pane-kicker">
                Etapa 03 de 03 · Itens e veículo
              </p>
              <p className="fiscal-pane-meta">
                {draft.kind === "nfe" ? "NF-e (produto)" : "NFS-e (serviço)"}
              </p>
            </div>
            <FiscalItemsStep
              disabled={disabled || busy}
              draft={draft}
              errors={errors}
              onChange={patchDraft}
            />
          </div>
        ) : null}

        <div className="fiscal-issue-footer">
          <FeatureActionButton
            disabled={disabled || busy || stepIndex === 0}
            icon={ArrowLeft}
            label="Voltar"
            onClick={() =>
              setStep(
                stepOptions[Math.max(0, stepIndex - 1)]?.value ?? "origin",
              )
            }
            title="Voltar"
          />
          {isLastStep ? (
            <FeatureActionButton
              disabled={disabled || busy}
              icon={Send}
              label="Revisar e emitir"
              onClick={requestReview}
              title="Revisar e emitir"
              variant="primary"
            />
          ) : (
            <FeatureActionButton
              disabled={disabled || busy}
              icon={ArrowRight}
              label="Avançar"
              onClick={() =>
                setStep(
                  stepOptions[Math.min(stepOptions.length - 1, stepIndex + 1)]
                    ?.value ?? "items",
                )
              }
              title="Avançar"
              variant="primary"
            />
          )}
        </div>
      </div>

      <FiscalIssueReviewDialog
        isSaving={busy}
        onClose={() => setReview(null)}
        onConfirm={() => void confirmIssue()}
        summary={review}
      />
    </FeatureSection>
  );
}

function createReviewSummary(
  draft: FiscalIssueDraft,
): FiscalIssueReviewSummary {
  const isNfe = draft.kind === "nfe";
  const total = isNfe
    ? computeIssueTotalCents(draft.items) / 100
    : amountFromInput(draft.nfse.grossAmount);
  const originLabel =
    draft.origin === "sale"
      ? `Venda (${draft.externalReference})`
      : draft.origin === "entry"
        ? `Lançamento financeiro (${draft.externalReference})`
        : `Avulsa (${draft.externalReference})`;
  return {
    itemsLabel: isNfe
      ? draft.items
          .map((item) => item.description)
          .filter(Boolean)
          .join("; ") || "—"
      : "Comissão de serviço (NFS-e)",
    kindLabel: isNfe ? "NF-e (produto)" : "NFS-e (serviço)",
    originLabel,
    recipientLabel: isNfe
      ? [draft.recipient.name, draft.recipient.document]
          .filter(Boolean)
          .join(" · ")
      : "Tomador do catálogo fiscal",
    totalLabel: formatBrl(total),
  };
}
