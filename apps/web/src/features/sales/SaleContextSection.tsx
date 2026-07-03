import { Activity, Car, ExternalLink } from "lucide-react";
import { FeatureSelect } from "../../components/ui/FeatureControls";
import { SaleField, SaleFormSection } from "./SaleWorkspaceForm";
import type {
  SaleContextOptions,
  SaleLeadOption,
  SaleSellerOption,
  SaleUnitOption,
} from "./saleContextOptions";
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
  const leadOptions = withFallback(options.leads, sale.leadId, (id) => ({
    buyerEmail: null,
    buyerName: null,
    buyerPhone: null,
    detail: "Lead informado no rascunho",
    id,
    label: "Lead vinculado ao rascunho",
    listingId: sale.listingId,
    vehicleTitle:
      typeof sale.listingSnapshot.title === "string"
        ? sale.listingSnapshot.title
        : null,
  }));
  const unitOptions = withFallback(options.units, sale.unitId, (id) => ({
    detail: "Unidade informada no rascunho",
    id,
    label: "Unidade vinculada ao rascunho",
    listingId: sale.listingId ?? "",
    listingTitle:
      typeof sale.listingSnapshot.title === "string"
        ? sale.listingSnapshot.title
        : "Veiculo vinculado",
    priceCents: sale.salePriceCents,
    unitLabel:
      typeof sale.listingSnapshot.unitLabel === "string"
        ? sale.listingSnapshot.unitLabel
        : "Unidade vinculada",
  }));
  const sellerOptions = withFallback(
    options.sellers,
    sale.sellerUserId,
    (id) => ({
      detail: "Usuario informado no rascunho",
      id,
      label: "Usuario vinculado ao rascunho",
      role: "salesman" as const,
    }),
  );

  const selectedLead = leadOptions.find((option) => option.id === sale.leadId);
  const selectedUnit = unitOptions.find((option) => option.id === sale.unitId);
  const selectedSeller = sellerOptions.find(
    (option) => option.id === sale.sellerUserId,
  );

  return (
    <SaleFormSection
      title="Contexto da Venda"
      icon={<Activity className="size-4.5 text-accent" />}
    >
      {contextMessage ? (
        <div className="md:col-span-2 rounded-lg border border-line bg-app px-3 py-2 text-xs font-bold text-muted">
          {contextMessage}
        </div>
      ) : null}

      <SaleField label="Lead Vinculado">
        <LinkedSelect
          emptyLabel="Selecione o lead"
          onChange={(id) =>
            update((draft) => applyLeadSelection(draft, leadOptions, id))
          }
          options={leadOptions}
          value={sale.leadId ?? ""}
        />
        <LinkedHint
          actionLabel="Ver clientes"
          detail={selectedLead?.detail}
          onOpen={() => {
            window.location.hash = "/crm?surface=leads";
          }}
        />
      </SaleField>

      <SaleField label="Unidade do Veículo">
        <LinkedSelect
          emptyLabel="Selecione a unidade"
          onChange={(id) =>
            update((draft) => applyUnitSelection(draft, unitOptions, id))
          }
          options={unitOptions}
          value={sale.unitId ?? ""}
        />
        <LinkedHint
          actionLabel="Abrir estoque"
          detail={selectedUnit?.detail}
          onOpen={
            sale.listingId
              ? () => {
                  const params = new URLSearchParams({
                    listing: sale.listingId ?? "",
                  });
                  if (sale.unitId) params.set("unit", sale.unitId);
                  window.location.hash = `/inventory?${params.toString()}`;
                }
              : undefined
          }
        />
      </SaleField>

      <SaleField label="Nome do Comprador">
        <input
          className="sales-input"
          onChange={(event) =>
            updateBuyer(sale, update, "name", event.target.value)
          }
          placeholder="Nome completo do cliente"
          value={String(sale.buyerSnapshot.name ?? "")}
        />
      </SaleField>
      <SaleField label="Telefone do Comprador">
        <input
          className="sales-input"
          onChange={(event) =>
            updateBuyer(sale, update, "phone", event.target.value)
          }
          placeholder="(00) 00000-0000"
          value={String(sale.buyerSnapshot.phone ?? "")}
        />
      </SaleField>
      <SaleField label="E-mail do Comprador">
        <input
          className="sales-input"
          onChange={(event) =>
            updateBuyer(sale, update, "email", event.target.value)
          }
          placeholder="email@cliente.com.br"
          value={String(sale.buyerSnapshot.email ?? "")}
        />
      </SaleField>
      <SaleField label="Vendedor Responsável">
        <LinkedSelect
          emptyLabel="Selecione o vendedor"
          onChange={(id) =>
            update((draft) => ({
              ...draft,
              sellerUserId: id || null,
            }))
          }
          options={sellerOptions}
          value={sale.sellerUserId ?? ""}
        />
        <LinkedHint detail={selectedSeller?.detail} />
      </SaleField>

      {typeof sale.listingSnapshot?.title === "string" &&
        sale.listingSnapshot.title && (
          <div className="md:col-span-2 sales-vehicle-preview">
            <div className="sales-vehicle-preview-icon">
              <Car className="size-5" />
            </div>
            <div className="sales-vehicle-preview-details">
              <span className="sales-vehicle-preview-title">
                {String(sale.listingSnapshot.title)}
              </span>
              <span className="sales-vehicle-preview-subtitle">
                {sale.listingSnapshot.unitLabel
                  ? `Unidade: ${String(sale.listingSnapshot.unitLabel)}`
                  : "Unidade não vinculada"}
              </span>
            </div>
          </div>
        )}
    </SaleFormSection>
  );
}

function LinkedSelect({
  emptyLabel,
  onChange,
  options,
  value,
}: {
  emptyLabel: string;
  onChange: (value: string) => void;
  options: readonly { detail: string; id: string; label: string }[];
  value: string;
}) {
  return (
    <FeatureSelect
      ariaLabel={emptyLabel}
      className="sales-input"
      onChange={onChange}
      options={[
        { label: emptyLabel, value: "" },
        ...options.map((option) => ({
          label: option.label,
          value: option.id,
        })),
      ]}
      value={value}
    />
  );
}

function LinkedHint({
  actionLabel,
  detail,
  onOpen,
}: {
  actionLabel?: string;
  detail: string | undefined;
  onOpen?: (() => void) | undefined;
}) {
  if (!detail && !onOpen) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-muted">
      {detail ? <span className="min-w-0 break-words">{detail}</span> : null}
      {onOpen && actionLabel ? (
        <button
          className="inline-flex items-center gap-1 rounded-lg border border-line bg-app px-2 py-1 font-black text-accent-strong"
          onClick={onOpen}
          type="button"
        >
          <ExternalLink aria-hidden="true" className="size-3" />
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function applyLeadSelection(
  draft: SaleRecord,
  leads: readonly SaleLeadOption[],
  id: string,
): SaleRecord {
  const lead = leads.find((option) => option.id === id);
  if (!id || !lead) return { ...draft, leadId: null };

  return {
    ...draft,
    buyerSnapshot: {
      ...draft.buyerSnapshot,
      email: lead.buyerEmail ?? draft.buyerSnapshot.email ?? "",
      name: lead.buyerName ?? draft.buyerSnapshot.name ?? "",
      phone: lead.buyerPhone ?? draft.buyerSnapshot.phone ?? "",
    },
    leadId: lead.id,
    listingId: draft.listingId ?? lead.listingId,
    listingSnapshot: {
      ...draft.listingSnapshot,
      title: draft.listingSnapshot.title ?? lead.vehicleTitle ?? "",
    },
  };
}

function applyUnitSelection(
  draft: SaleRecord,
  units: readonly SaleUnitOption[],
  id: string,
): SaleRecord {
  const unit = units.find((option) => option.id === id);
  if (!id || !unit) return { ...draft, unitId: null };

  return {
    ...draft,
    listingId: unit.listingId,
    listingSnapshot: {
      ...draft.listingSnapshot,
      title: unit.listingTitle,
      unitLabel: unit.unitLabel,
    },
    salePriceCents: draft.salePriceCents ?? unit.priceCents,
    unitId: unit.id,
  };
}

function withFallback<Option extends { id: string }>(
  options: readonly Option[],
  selectedId: string | null,
  createFallback: (id: string) => Option,
): readonly Option[] {
  if (!selectedId || options.some((option) => option.id === selectedId)) {
    return options;
  }
  return [createFallback(selectedId), ...options];
}

function updateBuyer(
  sale: SaleRecord,
  update: UpdateSale,
  key: string,
  value: string,
) {
  update((draft) => ({
    ...draft,
    buyerSnapshot: {
      ...sale.buyerSnapshot,
      [key]: value,
    },
  }));
}
