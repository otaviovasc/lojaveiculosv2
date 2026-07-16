import { useState, useEffect } from "react";
import { Car, User, Plus, Sparkles } from "lucide-react";
import { Combobox } from "../../components/ui/combobox";
import { applyInputMask, formatBrazilianPhone } from "../../lib/masks";
import { SaleField, SaleFormSection } from "./SaleWorkspaceForm";
import { SaleContextAcquisitionSection } from "./SaleContextAcquisitionSection";
import { SaleContextVehicleDetails } from "./SaleContextVehicleDetails";
import { formatCents, parseCurrency } from "./saleServicesFormat";
import { asSnapshotRecord } from "./salesSnapshot";
import type { SaleContextOptions } from "./saleContextOptions";
import type { SaleRecord } from "./types";

type UpdateSale = (updater: (sale: SaleRecord) => SaleRecord) => void;

export function ContextSection({
  contextMessage,
  options,
  sale,
  update,
}: {
  contextMessage?: string | null;
  options: SaleContextOptions;
  sale: SaleRecord;
  update: UpdateSale;
}) {
  const [createNewCustomer, setCreateNewCustomer] = useState(false);
  const [showAcquisition, setShowAcquisition] = useState(
    !!sale.listingSnapshot?.acquisitionDetails,
  );
  const [imageLoading, setImageLoading] = useState(false);

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
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (selectedUnitOption?.primaryMediaUrl) {
      setImageLoading(true);
      timer = setTimeout(() => setImageLoading(false), 800);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [sale.unitId, selectedUnitOption]);

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
            imageLoading={imageLoading}
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
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <SaleField label="Selecione um Lead Existente">
                <Combobox
                  options={leadOptions}
                  value={selectedLeadOption ? (sale.leadId ?? "") : ""}
                  onChange={handleLeadChange}
                  disabled={createNewCustomer}
                  placeholder="Selecione ou busque o lead no CRM..."
                />
              </SaleField>
            </div>

            <button
              type="button"
              onClick={() => {
                setCreateNewCustomer(!createNewCustomer);
                // Clear lead selection if custom client creation activated
                if (!createNewCustomer) {
                  update((draft) => ({
                    ...draft,
                    leadId: null,
                    buyerSnapshot: {
                      name: "",
                      phone: "",
                      email: "",
                      document: "",
                    },
                  }));
                }
              }}
              className={[
                "sales-secondary-button !h-12 flex items-center gap-2 justify-center transition-all",
                createNewCustomer
                  ? "border-accent bg-accent-soft text-accent-strong"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <Plus className="size-4" />
              <span>
                {createNewCustomer ? "Selecionar Existente" : "Cadastrar Novo"}
              </span>
            </button>
          </div>

          {/* Form details input */}
          <div className="grid gap-3 sm:grid-cols-2 mt-2 bg-app-elevated/20 p-4 rounded-xl border border-line/45">
            <div className="sm:col-span-2">
              <h4 className="text-xs font-black text-app-text uppercase tracking-wider mb-2">
                {createNewCustomer
                  ? "Dados do Novo Cliente"
                  : "Dados de Contato Cadastrados"}
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
