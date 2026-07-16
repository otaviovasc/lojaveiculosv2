import {
  Building,
  CheckCircle2,
  Coins,
  Edit,
  Eye,
  FileCheck2,
  User,
} from "lucide-react";
import {
  FeatureDialog,
  FeatureDialogActions,
} from "../../components/ui/FeatureOverlay";
import { formatBrazilianDocument, formatBrazilianPhone } from "../../lib/masks";
import {
  canPersistSaleWorkspaceEdits,
  formatCents,
  paymentPrincipalTotal,
} from "./salesModel";
import { asSnapshotRecord, snapshotNumber } from "./salesSnapshot";
import { salesStatusLabels } from "./SalesListModel";
import { SaleServicesDetails } from "./SalesListServiceDetails";
import type { SaleRecord } from "./types";
import { SaleVehicleSnapshotCard } from "./SaleVehicleSnapshotCard";

export function SalesListDetailsDialog({
  onClose,
  onEdit,
  sale,
}: {
  onClose: () => void;
  onEdit: (sale: SaleRecord) => void;
  sale: SaleRecord;
}) {
  const canEdit = canPersistSaleWorkspaceEdits(sale);
  return (
    <FeatureDialog
      className="max-w-3xl"
      description={
        <span className="flex flex-wrap items-center gap-2.5">
          <span>Rascunho de formalização</span>
          <span
            aria-hidden="true"
            className="size-1 rounded-full bg-muted/65"
          />
          <span>
            Atualizada em {new Date(sale.updatedAt).toLocaleDateString("pt-BR")}
          </span>
          <span
            aria-hidden="true"
            className="size-1 rounded-full bg-muted/65"
          />
          <span>Status: {salesStatusLabels[sale.status]}</span>
        </span>
      }
      footer={
        <FeatureDialogActions
          cancelLabel="Fechar painel"
          confirmIcon={
            canEdit ? (
              <Edit aria-hidden="true" className="size-4" />
            ) : (
              <Eye aria-hidden="true" className="size-4" />
            )
          }
          confirmLabel={
            canEdit ? "Formalizar / editar venda" : "Visualizar formalização"
          }
          onCancel={onClose}
          onConfirm={() => onEdit(sale)}
        />
      }
      icon={<FileCheck2 aria-hidden="true" />}
      isOpen
      onClose={onClose}
      title={
        String(sale.listingSnapshot?.title || "") || "Formalização de venda"
      }
    >
      <div className="flex flex-col gap-6">
        <SaleBuyerVehicleDetails sale={sale} />
        <SaleAcquisitionDetails sale={sale} />
        <SaleServicesDetails sale={sale} />
        <SaleFinancialDetails sale={sale} />
      </div>
    </FeatureDialog>
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
            value={formatBrazilianDocument(
              String(
                sale.buyerSnapshot.document || sale.buyerSnapshot.cpf || "",
              ),
            )}
          />
          <Meta
            label="Telefone"
            value={formatBrazilianPhone(String(sale.buyerSnapshot.phone || ""))}
          />
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

      <SaleVehicleSnapshotCard listingSnapshot={sale.listingSnapshot} />
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
          <span className="text-success-strong block mt-0.5 text-sm font-black">
            {formatCents(totalPaid)}
          </span>
        </div>
        <div>
          <span className="text-muted block text-xs uppercase font-bold">
            Diferença
          </span>
          {balance <= 0 ? (
            <span className="text-success-strong block mt-0.5 font-black uppercase text-xs flex items-center gap-1">
              <CheckCircle2 className="size-3.5" /> Quitada
            </span>
          ) : (
            <span className="text-danger block mt-0.5 font-black">
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
