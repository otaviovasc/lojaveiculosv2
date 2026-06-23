import { Handshake } from "lucide-react";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import type { InventoryApi } from "../api/apiClient";
import { createInventoryRuntimeHeaders } from "../api/inventoryRuntimeApi";
import {
  InventoryField,
  InventoryInput,
  InventoryPanel,
  InventorySelect,
  InventoryTextarea,
} from "./InventoryFormParts";
import {
  WorkflowStatus,
  WorkflowModePicker,
  WorkflowSubmitButton,
  parseOptionalMoney,
  parseRequiredMoney,
  type WorkflowMode,
  type WorkflowState,
} from "./InventoryWorkflowPanelParts";
import {
  buildWorkflowInput,
  createWorkflowForm,
  paymentMethods,
  savedModeMessage,
  validateWorkflowForm,
  type WorkflowForm,
} from "./InventoryWorkflowFormModel";
import type { InventoryListingDetail } from "../model/types";
import type { InventoryStoreSettings } from "./InventoryPrintTypes";
import {
  InventoryWorkflowPrintActions,
  InventoryWorkflowPrintPreview,
  type WorkflowPrintKind,
} from "./InventoryWorkflowDocuments";

export function InventoryWorkflowPanel({
  api,
  detail,
  onUpdated,
}: {
  api: InventoryApi;
  detail: InventoryListingDetail;
  onUpdated: (detail: InventoryListingDetail) => void;
}) {
  const primaryUnit = detail.units[0] ?? null;
  const [mode, setMode] = useState<WorkflowMode>("reserve");
  const [form, setForm] = useState(() => createWorkflowForm(detail));
  const [state, setState] = useState<WorkflowState>({ kind: "idle" });
  const isSaving = state.kind === "saving";
  const [activePrint, setActivePrint] = useState<WorkflowPrintKind | null>(
    null,
  );
  const [storeSettings, setStoreSettings] =
    useState<InventoryStoreSettings>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const headers = await createInventoryRuntimeHeaders();
        const res = await fetch("/api/v1/settings/store", { headers });
        if (res.ok) {
          const data = (await res.json()) as InventoryStoreSettings;
          setStoreSettings(data);
        }
      } catch (err) {
        console.error("Failed to load store settings", err);
      }
    };
    void fetchSettings();
  }, []);

  useEffect(() => {
    setForm(createWorkflowForm(detail));
    setState({ kind: "idle" });
  }, [detail]);

  const setField =
    (field: keyof WorkflowForm) =>
    (
      event: ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const salePriceCents = parseRequiredMoney(form.salePrice);
    const signalAmountCents = parseRequiredMoney(form.signalAmount);
    const paidAmountCents = parseOptionalMoney(form.paidAmount);
    const validationState = validateWorkflowForm(
      form,
      mode,
      salePriceCents,
      signalAmountCents,
      paidAmountCents,
    );

    if (validationState) {
      setState(validationState);
      return;
    }

    setState({ kind: "saving", mode });
    try {
      const input = buildWorkflowInput(form, salePriceCents as number);
      const updated =
        mode === "reserve"
          ? await api.reserveListing(detail.listing.id, {
              ...input,
              signalAmountCents: signalAmountCents as number,
            })
          : await api.sellListing(detail.listing.id, {
              ...input,
              ...(paidAmountCents !== undefined ? { paidAmountCents } : {}),
            });
      onUpdated(updated);
      setState(savedModeMessage(mode));
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <InventoryPanel
      icon={<Handshake className="size-5" />}
      title="Operacoes da loja"
    >
      <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
        <WorkflowModePicker
          mode={mode}
          primaryUnit={primaryUnit}
          setMode={setMode}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <InventoryField label="Unidade">
            <InventorySelect
              disabled={isSaving}
              onChange={setField("unitId")}
              value={form.unitId}
            >
              <option value="">Selecione</option>
              {detail.units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {[unit.stockNumber, unit.plate, unit.status]
                    .filter(Boolean)
                    .join(" / ")}
                </option>
              ))}
            </InventorySelect>
          </InventoryField>
          <InventoryField label="Forma de pagamento">
            <InventorySelect
              disabled={isSaving}
              onChange={setField("paymentMethod")}
              value={form.paymentMethod}
            >
              {paymentMethods.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </InventorySelect>
          </InventoryField>
          <InventoryField label="Cliente comprador">
            <InventoryInput
              disabled={isSaving}
              onChange={setField("buyerName")}
              value={form.buyerName}
            />
          </InventoryField>
          <InventoryField label="Documento">
            <InventoryInput
              disabled={isSaving}
              onChange={setField("buyerDocument")}
              value={form.buyerDocument}
            />
          </InventoryField>
          <InventoryField label="Telefone">
            <InventoryInput
              disabled={isSaving}
              onChange={setField("buyerPhone")}
              value={form.buyerPhone}
            />
          </InventoryField>
          <InventoryField label="Email">
            <InventoryInput
              disabled={isSaving}
              onChange={setField("buyerEmail")}
              type="email"
              value={form.buyerEmail}
            />
          </InventoryField>
          <InventoryField label="Valor de venda">
            <InventoryInput
              disabled={isSaving}
              inputMode="decimal"
              onChange={setField("salePrice")}
              value={form.salePrice}
            />
          </InventoryField>
          {mode === "reserve" ? (
            <InventoryField label="Sinal">
              <InventoryInput
                disabled={isSaving}
                inputMode="decimal"
                onChange={setField("signalAmount")}
                value={form.signalAmount}
              />
            </InventoryField>
          ) : (
            <InventoryField
              hint="Vazio usa o valor de venda."
              label="Valor pago"
            >
              <InventoryInput
                disabled={isSaving}
                inputMode="decimal"
                onChange={setField("paidAmount")}
                value={form.paidAmount}
              />
            </InventoryField>
          )}
        </div>

        <InventoryField label="Endereco">
          <InventoryInput
            disabled={isSaving}
            onChange={setField("buyerAddress")}
            value={form.buyerAddress}
          />
        </InventoryField>
        <InventoryField label="Observacao interna">
          <InventoryTextarea
            disabled={isSaving}
            onChange={setField("reason")}
            value={form.reason}
          />
        </InventoryField>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <WorkflowStatus state={state} />
          <WorkflowSubmitButton
            isDisabled={isSaving || !primaryUnit}
            isSaving={isSaving}
            mode={mode}
          />
        </div>

        <InventoryWorkflowPrintActions
          onPrint={setActivePrint}
          status={detail.listing.status}
        />
      </form>

      {activePrint && (
        <InventoryWorkflowPrintPreview
          activePrint={activePrint}
          detail={detail}
          form={form}
          onClose={() => setActivePrint(null)}
          primaryUnit={primaryUnit}
          storeSettings={storeSettings}
        />
      )}
    </InventoryPanel>
  );
}
