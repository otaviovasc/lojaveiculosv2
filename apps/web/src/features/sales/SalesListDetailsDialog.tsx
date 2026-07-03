import {
  Building,
  Car,
  CheckCircle2,
  Coins,
  Edit,
  User,
  X,
} from "lucide-react";
import { formatCents, paymentPrincipalTotal } from "./salesModel";
import { asSnapshotRecord, snapshotNumber } from "./salesSnapshot";
import { salesStatusLabels } from "./SalesListModel";
import { SaleServicesDetails } from "./SalesListServiceDetails";
import type { SaleRecord } from "./types";

export function SalesListDetailsDialog({
  onClose,
  onEdit,
  sale,
}: {
  onClose: () => void;
  onEdit: (sale: SaleRecord) => void;
  sale: SaleRecord;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-panel border border-line rounded-3xl w-full max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl relative flex flex-col">
        <div
          className={[
            "p-6 border-b border-line/50 flex justify-between items-start gap-4",
            saleStatusBannerClass(sale.status),
          ].join(" ")}
        >
          <div>
            <span className="text-xs font-black text-muted uppercase tracking-widest block mb-1">
              Detalhes do Rascunho de Formalização
            </span>
            <h3 className="text-lg font-black text-app-text uppercase tracking-wider">
              {String(sale.listingSnapshot?.title || "") ||
                "Formalização de Venda"}
            </h3>
            <div className="flex flex-wrap gap-2.5 items-center mt-2.5">
              <span className="text-xs font-bold text-muted">
                Atualizada em{" "}
                {new Date(sale.updatedAt).toLocaleDateString("pt-BR")}
              </span>
              <span className="size-1 rounded-full bg-muted/65" />
              <span className="text-xs font-bold text-muted">
                Status: {salesStatusLabels[sale.status]}
              </span>
            </div>
          </div>

          <button
            className="p-2 hover:bg-app-elevated rounded-xl border border-line/55 transition-colors cursor-pointer shrink-0"
            onClick={onClose}
            type="button"
          >
            <X className="size-5 text-muted" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex flex-col gap-6">
          <SaleBuyerVehicleDetails sale={sale} />
          <SaleAcquisitionDetails sale={sale} />
          <SaleServicesDetails sale={sale} />
          <SaleFinancialDetails sale={sale} />
        </div>

        <div className="p-6 border-t border-line/50 flex justify-between items-center bg-app-elevated/25">
          <button
            className="sales-primary-button !min-h-10 !h-10 text-xs flex items-center gap-2"
            onClick={() => onEdit(sale)}
            type="button"
          >
            <div className="gloss-overlay" />
            <Edit className="size-4" />
            <span>Formalizar / Editar Venda</span>
          </button>

          <button
            className="sales-secondary-button !min-h-10 !h-10 text-xs"
            onClick={onClose}
            type="button"
          >
            Fechar Painel
          </button>
        </div>
      </div>
    </div>
  );
}

function SaleBuyerVehicleDetails({ sale }: { sale: SaleRecord }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="bg-app-elevated/10 border border-line/40 rounded-2xl p-4 flex flex-col gap-3">
        <h4 className="text-xs font-black text-app-text uppercase tracking-wider border-b border-line/35 pb-2 flex items-center gap-1.5">
          <User className="size-4.5 text-accent" />
          <span>Dados do Cliente</span>
        </h4>
        <dl className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs font-bold">
          <Meta label="Nome" value={sale.buyerSnapshot.name} />
          <Meta
            label="CPF/CNPJ"
            value={sale.buyerSnapshot.document || sale.buyerSnapshot.cpf}
          />
          <Meta label="Telefone" value={sale.buyerSnapshot.phone} />
          <Meta label="E-mail" value={sale.buyerSnapshot.email} truncate />
          <div className="col-span-2">
            <dt className="text-muted text-xs uppercase font-bold">Endereço</dt>
            <dd className="text-app-text block mt-0.5 leading-relaxed">
              {[
                sale.buyerSnapshot.address,
                sale.buyerSnapshot.city,
                sale.buyerSnapshot.state,
              ]
                .filter(Boolean)
                .join(", ") || "Não preenchido"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="bg-app-elevated/10 border border-line/40 rounded-2xl p-4 flex flex-col gap-3">
        <h4 className="text-xs font-black text-app-text uppercase tracking-wider border-b border-line/35 pb-2 flex items-center gap-1.5">
          <Car className="size-4.5 text-accent" />
          <span>Dados do Veículo</span>
        </h4>

        <div className="flex items-center gap-3 bg-app-elevated/30 p-2 rounded-xl border border-line/40">
          <div className="size-14 rounded-lg bg-app-elevated border border-line/50 overflow-hidden flex items-center justify-center shrink-0">
            {sale.listingSnapshot?.primaryMediaUrl ? (
              <img
                alt={String(sale.listingSnapshot.title || "Veículo")}
                className="w-full h-full object-cover"
                src={String(sale.listingSnapshot.primaryMediaUrl)}
              />
            ) : (
              <Car className="size-6 text-muted/40" />
            )}
          </div>
          <div className="min-w-0">
            <h5 className="text-xs font-black text-app-text uppercase tracking-wider block truncate">
              {String(
                sale.listingSnapshot?.title || "Veículo não especificado",
              )}
            </h5>
            {!!sale.listingSnapshot?.colorName && (
              <span className="text-xs font-bold text-muted uppercase mt-0.5 block">
                Cor: {String(sale.listingSnapshot.colorName)}
              </span>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs font-bold mt-1">
          <Meta
            label="Placa / Estoque"
            value={
              sale.listingSnapshot.plate
                ? `PLACA: ${String(sale.listingSnapshot.plate)}`
                : sale.listingSnapshot.unitLabel
                  ? `ESTOQUE: ${String(sale.listingSnapshot.unitLabel)}`
                  : null
            }
          />
          <Meta
            label="Ano Fabricação/Modelo"
            value={
              sale.listingSnapshot.manufactureYear ||
              sale.listingSnapshot.modelYear
                ? `${sale.listingSnapshot.manufactureYear ?? "N/A"} / ${sale.listingSnapshot.modelYear ?? "N/A"}`
                : null
            }
          />
          <Meta label="Chassi" value={sale.listingSnapshot.chassi} truncate />
          <Meta label="Renavam" value={sale.listingSnapshot.renavam} truncate />
        </dl>
      </div>
    </div>
  );
}

function SaleAcquisitionDetails({ sale }: { sale: SaleRecord }) {
  if (!sale.listingSnapshot.acquisitionDetails) return null;
  const acq = asSnapshotRecord(sale.listingSnapshot.acquisitionDetails);
  const priceCents = snapshotNumber(acq.priceCents);
  return (
    <div className="bg-app-elevated/10 border border-line/40 rounded-2xl p-4 flex flex-col gap-3">
      <h4 className="text-xs font-black text-app-text uppercase tracking-wider border-b border-line/35 pb-2 flex items-center gap-1.5">
        <Building className="size-4.5 text-accent" />
        <span>Detalhes de Aquisição do Veículo</span>
      </h4>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold">
        <div className="col-span-2">
          <dt className="text-muted text-xs uppercase font-bold">
            Comprado de
          </dt>
          <dd className="text-app-text block mt-0.5">
            {String(acq.supplierName || "Não preenchido")}
          </dd>
        </div>
        <Meta
          label="Custo de Compra"
          value={priceCents ? formatCents(priceCents) : null}
        />
        <Meta label="Data Compra" value={acq.purchaseDate} />
      </dl>
    </div>
  );
}

function SaleFinancialDetails({ sale }: { sale: SaleRecord }) {
  const totalPaid = paymentPrincipalTotal(sale);
  const balance = (sale.salePriceCents ?? 0) - totalPaid;
  return (
    <div className="bg-app-elevated/10 border border-line/40 rounded-2xl p-4 flex flex-col gap-3">
      <h4 className="text-xs font-black text-app-text uppercase tracking-wider border-b border-line/35 pb-2 flex items-center gap-1.5">
        <Coins className="size-4.5 text-accent" />
        <span>Composição Financeira da Venda</span>
      </h4>

      <div className="grid grid-cols-3 gap-4 text-xs font-bold mb-2">
        <div>
          <span className="text-muted block text-xs uppercase font-bold">
            Preço Combinado
          </span>
          <span className="text-app-text block mt-0.5 text-sm font-black">
            {sale.salePriceCents
              ? formatCents(sale.salePriceCents)
              : "Preço pendente"}
          </span>
        </div>
        <div>
          <span className="text-muted block text-xs uppercase font-bold">
            Total Pago (Lançado)
          </span>
          <span className="text-emerald-500 block mt-0.5 text-sm font-black">
            {formatCents(totalPaid)}
          </span>
        </div>
        <div>
          <span className="text-muted block text-xs uppercase font-bold">
            Diferença
          </span>
          {balance <= 0 ? (
            <span className="text-emerald-500 block mt-0.5 font-black uppercase text-xs flex items-center gap-1">
              <CheckCircle2 className="size-3.5" /> Quitada
            </span>
          ) : (
            <span className="text-rose-500 block mt-0.5 font-black">
              {formatCents(balance)} restante
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Meta({
  label,
  truncate,
  value,
}: {
  label: string;
  truncate?: boolean;
  value: unknown;
}) {
  return (
    <div>
      <dt className="text-muted text-xs uppercase font-bold">{label}</dt>
      <dd
        className={["text-app-text block mt-0.5", truncate ? "truncate" : ""]
          .filter(Boolean)
          .join(" ")}
      >
        {String(value || "Não preenchido")}
      </dd>
    </div>
  );
}

function saleStatusBannerClass(status: SaleRecord["status"]) {
  if (status === "closed") return "bg-emerald-500/10 border-emerald-500/25";
  if (status === "pending") return "bg-amber-500/10 border-amber-500/25";
  return "bg-blue-500/10 border-blue-500/25";
}
