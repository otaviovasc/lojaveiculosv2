import {
  Activity,
  Banknote,
  Car,
  Check,
  Coins,
  FileText,
  HelpCircle,
  Plus,
  User,
} from "lucide-react";
import {
  defaultRequiredDocumentKinds,
  formatCents,
  parseCurrencyInput,
  paymentPrincipalTotal,
  requiredDocumentKinds,
  saleMissingFields,
} from "./salesModel";
import { PaymentRow, newPayment } from "./SalePaymentRow";
import { SaleField, SaleFormSection } from "./SaleWorkspaceForm";
import type { SaleRecord } from "./types";

type UpdateSale = (updater: (sale: SaleRecord) => SaleRecord) => void;

export function ContextSection({ sale, update }: SectionProps) {
  return (
    <SaleFormSection
      title="Contexto da Venda"
      icon={<Activity className="size-4.5 text-accent" />}
    >
      <SaleField label="Lead Vinculado">
        <input
          className="sales-input"
          onChange={(event) =>
            update((draft) => ({
              ...draft,
              leadId: event.target.value || null,
            }))
          }
          placeholder="Selecione ou informe o lead vinculado"
          value={sale.leadId ?? ""}
        />
      </SaleField>
      <SaleField label="Unidade do Veículo">
        <input
          className="sales-input"
          onChange={(event) =>
            update((draft) => ({
              ...draft,
              unitId: event.target.value || null,
            }))
          }
          placeholder="Selecione a unidade do veículo"
          value={sale.unitId ?? ""}
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
        <input
          className="sales-input"
          onChange={(event) =>
            update((draft) => ({
              ...draft,
              sellerUserId: event.target.value || null,
            }))
          }
          placeholder="Nome ou usuário do vendedor"
          value={sale.sellerUserId ?? ""}
        />
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

export function TermsSection({ sale, update }: SectionProps) {
  return (
    <SaleFormSection
      title="Preço e Condições"
      icon={<Banknote className="size-4.5 text-accent" />}
    >
      <SaleField label="Preço da Venda">
        <input
          className="sales-input text-lg font-black text-accent-strong"
          inputMode="numeric"
          onChange={(event) =>
            update((draft) => ({
              ...draft,
              salePriceCents: parseCurrencyInput(event.target.value),
            }))
          }
          placeholder="R$ 0,00"
          value={sale.salePriceCents ? formatCents(sale.salePriceCents) : ""}
        />
      </SaleField>
      <SaleField label="Origem Comercial">
        <select
          className="sales-input"
          onChange={(event) =>
            update((draft) => ({
              ...draft,
              saleSourceSnapshot: {
                ...draft.saleSourceSnapshot,
                source: event.target.value,
              },
            }))
          }
          value={String(sale.saleSourceSnapshot.source ?? "lead")}
        >
          <option value="lead">Lead Digital</option>
          <option value="walk_in">Loja Física (Walk-in)</option>
          <option value="whatsapp">WhatsApp Comercial</option>
          <option value="marketplace">Marketplace Externo</option>
          <option value="custom">Outro Canal</option>
        </select>
      </SaleField>
    </SaleFormSection>
  );
}

export function PaymentsSection({ sale, update }: SectionProps) {
  const addPayment = () =>
    update((draft) => ({
      ...draft,
      payments: [
        ...draft.payments,
        newPayment(draft.salePriceCents ?? 0, draft.payments.length),
      ],
    }));

  const totalPaid = paymentPrincipalTotal(sale);
  const salePrice = sale.salePriceCents ?? 0;
  const balance = salePrice - totalPaid;
  const progressPercent =
    salePrice > 0 ? Math.min(100, (totalPaid / salePrice) * 100) : 0;

  return (
    <SaleFormSection
      title="Condições de Pagamento"
      icon={<Coins className="size-4.5 text-accent" />}
    >
      <div className="md:col-span-2 flex flex-col gap-4">
        {/* Payment Balance Progress Indicator */}
        <div className="sales-glass-panel p-4 bg-app-elevated/40 border border-line flex flex-col gap-3">
          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-muted uppercase tracking-wider">
              Progressão de Quitação
            </span>
            <span className="text-app-text font-black">
              {formatCents(totalPaid)} de {formatCents(salePrice)} (
              {progressPercent.toFixed(0)}%)
            </span>
          </div>
          <div className="sales-progress-bar-container">
            <div
              className={
                "sales-progress-bar-fill " +
                (balance <= 0 ? "bg-emerald-500" : "bg-accent")
              }
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-muted">
              Total Lançado: {sale.payments.length} parcelas
            </span>
            {balance <= 0 ? (
              <span className="text-emerald-500 font-black flex items-center gap-1 uppercase tracking-wider">
                <Check className="size-3" /> Valor Total Coberto
              </span>
            ) : (
              <span className="text-rose-500 font-black uppercase tracking-wider">
                Faltam: {formatCents(balance)}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {sale.payments.map((payment, index) => (
            <PaymentRow
              index={index}
              key={payment.id}
              onChange={(next) =>
                update((draft) => ({
                  ...draft,
                  payments: draft.payments.map((item, itemIndex) =>
                    itemIndex === index ? next : item,
                  ),
                }))
              }
              onRemove={() =>
                update((draft) => ({
                  ...draft,
                  payments: draft.payments.filter(
                    (_, itemIndex) => itemIndex !== index,
                  ),
                }))
              }
              payment={payment}
            />
          ))}
          <button
            className="sales-secondary-button w-full border-dashed"
            onClick={addPayment}
            type="button"
          >
            <Plus className="size-4 text-accent" />
            Adicionar Linha de Pagamento
          </button>
        </div>
      </div>
    </SaleFormSection>
  );
}

export function DocumentsSection({ sale, update }: SectionProps) {
  const required = requiredDocumentKinds(sale).length
    ? requiredDocumentKinds(sale)
    : defaultRequiredDocumentKinds;
  return (
    <SaleFormSection
      title="Documentos Obrigatórios"
      icon={<FileText className="size-4.5 text-accent" />}
    >
      <div className="grid gap-3 md:col-span-2">
        <p className="text-xs font-bold text-muted leading-relaxed mb-1">
          Selecione os documentos necessários para a formalização do contrato de
          compra e venda.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {required.map((kind) => {
            const checked = sale.selectedDocumentKinds.includes(kind);
            return (
              <label
                className={
                  "sales-check-row " +
                  (checked ? "sales-check-row-checked" : "")
                }
                key={kind}
              >
                <input
                  checked={checked}
                  onChange={(event) =>
                    update((draft) => ({
                      ...draft,
                      selectedDocumentKinds: event.target.checked
                        ? [...draft.selectedDocumentKinds, kind]
                        : draft.selectedDocumentKinds.filter(
                            (item) => item !== kind,
                          ),
                    }))
                  }
                  type="checkbox"
                />
                <span>{formatDocumentKindLabel(kind)}</span>
              </label>
            );
          })}
        </div>
      </div>
    </SaleFormSection>
  );
}

type SectionProps = { sale: SaleRecord; update: UpdateSale };

function updateBuyer(
  sale: SaleRecord,
  update: UpdateSale,
  key: string,
  value: string,
) {
  update(() => ({
    ...sale,
    buyerSnapshot: { ...sale.buyerSnapshot, [key]: value },
  }));
}

function formatDocumentKindLabel(kind: string): string {
  switch (kind) {
    case "sale_contract":
      return "Contrato de Compra e Venda";
    case "sale_receipt":
      return "Recibo de Venda";
    case "delivery_term":
      return "Termo de Entrega";
    case "power_of_attorney":
      return "Procuração";
    default:
      return kind.replace(/_/g, " ").toUpperCase();
  }
}
