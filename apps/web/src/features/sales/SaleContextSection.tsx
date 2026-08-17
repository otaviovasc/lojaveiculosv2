import { useEffect, useState } from "react";
import { Car, CheckCircle2, User, UserPlus, Sparkles } from "lucide-react";
import { Combobox } from "../../components/ui/combobox";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { applyInputMask, formatBrazilianPhone } from "../../lib/masks";
import { SaleField, SaleFormSection } from "./SaleWorkspaceForm";
import { SaleContextAcquisitionSection } from "./SaleContextAcquisitionSection";
import { SaleContextVehicleDetails } from "./SaleContextVehicleDetails";
import { formatCents, parseCurrency } from "./saleServicesFormat";
import { asSnapshotRecord } from "./salesSnapshot";
import type {
  CreateSaleLeadInput,
  SaleContextOptions,
  SaleLeadOption,
} from "./saleContextOptions";
import type { SaleRecord } from "./types";

type UpdateSale = (updater: (sale: SaleRecord) => SaleRecord) => void;

export function ContextSection({
  contextMessage,
  onCreateLead,
  options,
  sale,
  update,
}: {
  contextMessage?: string | null;
  onCreateLead?: (input: CreateSaleLeadInput) => Promise<SaleLeadOption>;
  options: SaleContextOptions;
  sale: SaleRecord;
  update: UpdateSale;
}) {
  const [customerMode, setCustomerMode] = useState<"existing" | "new">(
    "existing",
  );
  const [leadCreationState, setLeadCreationState] = useState<
    | { kind: "idle" }
    | { kind: "saving" }
    | { kind: "success"; message: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" });
  const [showAcquisition, setShowAcquisition] = useState(
    !!sale.listingSnapshot?.acquisitionDetails,
  );

  const vehicleOptions = options.units.map((unit) => ({
    label: unit.label,
    value: unit.id,
  }));

  const leadOptions = options.leads.map((lead) => ({
    label: lead.label,
    value: lead.id,
  }));

  const sellerOptions = options.sellers.map((seller) => ({
    label: seller.label,
    value: seller.id,
  }));

  const selectedUnitOption = options.units.find(
    (unit) => unit.id === sale.unitId,
  );
  const selectedLeadOption = options.leads.find(
    (lead) => lead.id === sale.leadId,
  );
  const selectedSellerOption = options.sellers.find(
    (seller) => seller.id === sale.sellerUserId,
  );

  useEffect(() => {
    if (!selectedUnitOption) return;
    const currentChassis = String(sale.listingSnapshot.chassi ?? "").trim();
    const currentRenavam = String(sale.listingSnapshot.renavam ?? "").trim();
    const shouldFillChassis =
      !currentChassis && Boolean(selectedUnitOption.vin);
    const shouldFillRenavam =
      !currentRenavam && Boolean(selectedUnitOption.renavam);
    if (!shouldFillChassis && !shouldFillRenavam) return;

    update((draft) => ({
      ...draft,
      listingSnapshot: {
        ...draft.listingSnapshot,
        ...(shouldFillChassis ? { chassi: selectedUnitOption.vin } : {}),
        ...(shouldFillRenavam ? { renavam: selectedUnitOption.renavam } : {}),
      },
    }));
  }, [
    sale.listingSnapshot.chassi,
    sale.listingSnapshot.renavam,
    selectedUnitOption,
    update,
  ]);

  const handleVehicleChange = (unitId: string) => {
    const unit = options.units.find((u) => u.id === unitId);
    if (!unit) {
      update((draft) => ({
        ...draft,
        unitId: null,
        listingId: null,
        listingSnapshot: {
          ...draft.listingSnapshot,
          title: "",
          unitLabel: "",
        },
      }));
      return;
    }

    update((draft) => ({
      ...draft,
      unitId: unit.id,
      listingId: unit.listingId,
      listingSnapshot: {
        ...draft.listingSnapshot,
        title: unit.listingTitle,
        unitLabel: unit.unitLabel,
        primaryMediaUrl: unit.primaryMediaUrl,
        plate: unit.plate,
        colorName: unit.colorName,
        manufactureYear: unit.manufactureYear,
        modelYear: unit.modelYear,
        mileageKm: unit.mileageKm,
        chassi: unit.vin,
        renavam: unit.renavam,
      },
      salePriceCents: draft.salePriceCents ?? unit.priceCents,
    }));
  };

  const handleLeadChange = (leadId: string) => {
    const lead = options.leads.find((l) => l.id === leadId);
    if (!lead) {
      update((draft) => ({
        ...draft,
        leadId: null,
      }));
      return;
    }

    update((draft) => ({
      ...draft,
      leadId: lead.id,
      buyerSnapshot: {
        ...draft.buyerSnapshot,
        name: lead.buyerName ?? draft.buyerSnapshot.name ?? "",
        phone: lead.buyerPhone ?? draft.buyerSnapshot.phone ?? "",
        email: lead.buyerEmail ?? draft.buyerSnapshot.email ?? "",
      },
      listingId: draft.listingId ?? lead.listingId,
      listingSnapshot: {
        ...draft.listingSnapshot,
        title: draft.listingSnapshot.title ?? lead.vehicleTitle ?? "",
      },
    }));
  };

  const handleSellerChange = (sellerId: string) => {
    update((draft) => ({
      ...draft,
      sellerUserId: sellerId || null,
    }));
  };

  const handleCreateLead = async () => {
    const buyerName = String(sale.buyerSnapshot.name ?? "").trim();
    const buyerPhone = String(sale.buyerSnapshot.phone ?? "").trim() || null;
    const buyerEmail = String(sale.buyerSnapshot.email ?? "").trim() || null;
    if (!buyerName) {
      setLeadCreationState({
        kind: "error",
        message: "Informe o nome do comprador antes de criar o lead.",
      });
      return;
    }
    if (!onCreateLead) {
      setLeadCreationState({
        kind: "error",
        message: "A criação de leads não está disponível nesta sessão.",
      });
      return;
    }

    setLeadCreationState({ kind: "saving" });
    try {
      const lead = await onCreateLead({
        buyerEmail,
        buyerName,
        buyerPhone,
        listingId: sale.listingId,
        saleId: sale.id,
      });
      update((draft) => ({
        ...draft,
        leadId: lead.id,
        buyerSnapshot: {
          ...draft.buyerSnapshot,
          email: lead.buyerEmail ?? buyerEmail ?? "",
          name: lead.buyerName ?? buyerName,
          phone: lead.buyerPhone ?? buyerPhone ?? "",
        },
      }));
      setCustomerMode("existing");
      setLeadCreationState({
        kind: "success",
        message: "Lead criado e vinculado a esta venda.",
      });
    } catch (error) {
      setLeadCreationState({
        kind: "error",
        message: formatApiErrorDisplay(error, "Não foi possível criar o lead."),
      });
    }
  };

  const handleAcquisitionChange = (key: string, value: unknown) => {
    update((draft) => {
      const currentDetails = asSnapshotRecord(
        draft.listingSnapshot.acquisitionDetails,
      );
      return {
        ...draft,
        listingSnapshot: {
          ...draft.listingSnapshot,
          acquisitionDetails: {
            ...currentDetails,
            [key]: value,
          },
        },
      };
    });
  };

  const handleAcquisitionToggle = () => {
    const nextVal = !showAcquisition;
    setShowAcquisition(nextVal);
    if (!nextVal) {
      update((draft) => {
        const { acquisitionDetails, ...rest } = draft.listingSnapshot;
        return {
          ...draft,
          listingSnapshot: rest,
        };
      });
    } else {
      handleAcquisitionChange("supplierName", "");
    }
  };

  const formatCurrency = (cents: number | null | undefined) => {
    return cents ? formatCents(cents) : "";
  };

  const acqDetails = asSnapshotRecord(sale.listingSnapshot.acquisitionDetails);

  return (
    <div className="flex flex-col gap-6">
      {contextMessage ? (
        <div className="rounded-xl border border-line bg-app px-4 py-3 text-xs font-bold text-muted flex items-center gap-2">
          <Sparkles className="size-4 text-accent" />
          <span>{contextMessage}</span>
        </div>
      ) : null}

      {/* STEP 1.1: VEHICLE SELECTION */}
      <SaleFormSection
        title="1. Veículo da Venda"
        icon={<Car className="size-4.5 text-accent" />}
      >
        <div className="md:col-span-2 grid gap-4">
          <SaleField label="Selecione o Veículo do Estoque">
            <Combobox
              options={vehicleOptions}
              value={selectedUnitOption ? (sale.unitId ?? "") : ""}
              onChange={handleVehicleChange}
              placeholder="Digite o modelo, placa ou estoque..."
            />
          </SaleField>

          <SaleContextVehicleDetails
            formatCurrency={formatCurrency}
            selectedUnitOption={selectedUnitOption}
          />
        </div>
      </SaleFormSection>

      {/* STEP 1.2: LEAD / BUYER SELECTION */}
      <SaleFormSection
        title="2. Cliente (Lead / Comprador)"
        icon={<User className="size-4.5 text-accent" />}
      >
        <div className="md:col-span-2 flex flex-col gap-4">
          <div
            className="grid gap-2 sm:grid-cols-2"
            role="group"
            aria-label="Origem do comprador"
          >
            <button
              aria-pressed={customerMode === "existing"}
              className={[
                "sales-secondary-button min-h-12 justify-center",
                customerMode === "existing"
                  ? "border-accent bg-accent-soft text-accent-strong"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                setCustomerMode("existing");
                setLeadCreationState({ kind: "idle" });
              }}
              type="button"
            >
              <User className="size-4" />
              Usar lead existente
            </button>
            <button
              aria-pressed={customerMode === "new"}
              className={[
                "sales-secondary-button min-h-12 justify-center",
                customerMode === "new"
                  ? "border-accent bg-accent-soft text-accent-strong"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                setCustomerMode("new");
                setLeadCreationState({ kind: "idle" });
                update((draft) => ({ ...draft, leadId: null }));
              }}
              type="button"
            >
              <UserPlus className="size-4" />
              Criar novo lead
            </button>
          </div>

          {customerMode === "existing" ? (
            <div className="grid gap-2">
              <SaleField label="Selecione um Lead Existente">
                <Combobox
                  options={leadOptions}
                  value={selectedLeadOption ? (sale.leadId ?? "") : ""}
                  onChange={handleLeadChange}
                  placeholder="Selecione ou busque o lead no CRM..."
                />
              </SaleField>
              {sale.leadId ? (
                <div className="flex items-center gap-2 rounded-xl border border-success/25 bg-success/5 px-3 py-2 text-xs font-bold text-success-strong">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>
                    Lead vinculado. A venda já pode usar este comprador.
                  </span>
                </div>
              ) : (
                <p className="text-xs font-bold text-muted">
                  Busque pelo nome, telefone ou e-mail já cadastrado no CRM.
                </p>
              )}
            </div>
          ) : (
            <p className="rounded-xl border border-line/60 bg-app px-3 py-2 text-xs font-bold text-muted">
              Preencha os dados abaixo e clique em “Criar lead e vincular”. Só
              então o fechamento reconhecerá o comprador no CRM.
            </p>
          )}

          {/* Form details input */}
          <div className="grid gap-3 sm:grid-cols-2 mt-2 bg-app-elevated/20 p-4 rounded-xl border border-line/45">
            <div className="sm:col-span-2">
              <h4 className="text-xs font-black text-app-text uppercase tracking-wider mb-2">
                {customerMode === "new"
                  ? "Dados do novo lead"
                  : "Dados do comprador nesta venda"}
              </h4>
            </div>

            <SaleField label="Nome Completo">
              <input
                className="sales-input"
                value={String(sale.buyerSnapshot.name ?? "")}
                onChange={(e) =>
                  update((draft) => ({
                    ...draft,
                    buyerSnapshot: {
                      ...draft.buyerSnapshot,
                      name: e.target.value,
                    },
                  }))
                }
                placeholder="Ex: João Silva de Souza"
              />
            </SaleField>

            <SaleField label="Telefone">
              <input
                className="sales-input"
                inputMode="tel"
                value={formatBrazilianPhone(
                  String(sale.buyerSnapshot.phone ?? ""),
                )}
                onChange={(event) => {
                  const phone = applyInputMask(
                    event.currentTarget,
                    formatBrazilianPhone,
                  );
                  update((draft) => ({
                    ...draft,
                    buyerSnapshot: {
                      ...draft.buyerSnapshot,
                      phone,
                    },
                  }));
                }}
                placeholder="Ex: (11) 99999-9999"
                type="tel"
              />
            </SaleField>

            <SaleField label="E-mail">
              <input
                className="sales-input"
                value={String(sale.buyerSnapshot.email ?? "")}
                onChange={(e) =>
                  update((draft) => ({
                    ...draft,
                    buyerSnapshot: {
                      ...draft.buyerSnapshot,
                      email: e.target.value,
                    },
                  }))
                }
                placeholder="Ex: joao.silva@email.com"
              />
            </SaleField>

            <SaleField label="Vendedor Responsável">
              <Combobox
                options={sellerOptions}
                value={selectedSellerOption ? (sale.sellerUserId ?? "") : ""}
                onChange={handleSellerChange}
                placeholder="Selecione o vendedor..."
              />
            </SaleField>

            {customerMode === "new" ? (
              <div className="sm:col-span-2 grid gap-2">
                <button
                  className="sales-primary-button w-full justify-center"
                  disabled={leadCreationState.kind === "saving"}
                  onClick={() => void handleCreateLead()}
                  type="button"
                >
                  <UserPlus className="size-4" />
                  {leadCreationState.kind === "saving"
                    ? "Criando e vinculando..."
                    : "Criar lead e vincular à venda"}
                </button>
                {leadCreationState.kind === "error" ? (
                  <p className="text-xs font-bold text-danger" role="alert">
                    {leadCreationState.message}
                  </p>
                ) : null}
              </div>
            ) : leadCreationState.kind === "success" ? (
              <p
                className="sm:col-span-2 flex items-center gap-2 text-xs font-bold text-success-strong"
                role="status"
              >
                <CheckCircle2 className="size-4" />
                {leadCreationState.message}
              </p>
            ) : null}
          </div>
        </div>
      </SaleFormSection>

      <SaleContextAcquisitionSection
        acqDetails={acqDetails}
        onChange={handleAcquisitionChange}
        onToggle={handleAcquisitionToggle}
        parseCurrency={parseCurrency}
        showAcquisition={showAcquisition}
      />
    </div>
  );
}
