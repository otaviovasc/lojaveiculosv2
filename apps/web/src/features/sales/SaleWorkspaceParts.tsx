import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import {
  defaultRequiredDocumentKinds,
  formatCents,
  parseCurrencyInput,
  requiredDocumentKinds,
} from "./salesModel";
import { PaymentRow, newPayment } from "./SalePaymentRow";
import type { SaleRecord } from "./types";

type UpdateSale = (updater: (sale: SaleRecord) => SaleRecord) => void;

export function ContextSection({ sale, update }: SectionProps) {
  return (
    <Section title="Contexto">
      <Field label="Lead vinculado">
        <input
          className="sales-input"
          onChange={(event) =>
            update((draft) => ({
              ...draft,
              leadId: event.target.value || null,
            }))
          }
          placeholder="ID do lead"
          value={sale.leadId ?? ""}
        />
      </Field>
      <Field label="Comprador">
        <input
          className="sales-input"
          onChange={(event) =>
            updateBuyer(sale, update, "name", event.target.value)
          }
          value={String(sale.buyerSnapshot.name ?? "")}
        />
      </Field>
      <Field label="Telefone">
        <input
          className="sales-input"
          onChange={(event) =>
            updateBuyer(sale, update, "phone", event.target.value)
          }
          value={String(sale.buyerSnapshot.phone ?? "")}
        />
      </Field>
      <Field label="Veiculo">
        <input
          className="sales-input"
          onChange={(event) =>
            update((draft) => ({
              ...draft,
              unitId: event.target.value || null,
            }))
          }
          placeholder="ID da unidade"
          value={sale.unitId ?? ""}
        />
      </Field>
      <Field label="Vendedor">
        <input
          className="sales-input"
          onChange={(event) =>
            update((draft) => ({
              ...draft,
              sellerUserId: event.target.value || null,
            }))
          }
          placeholder="ID do usuario"
          value={sale.sellerUserId ?? ""}
        />
      </Field>
    </Section>
  );
}

export function TermsSection({ sale, update }: SectionProps) {
  return (
    <Section title="Valores">
      <Field label="Preco da venda">
        <input
          className="sales-input"
          inputMode="numeric"
          onChange={(event) =>
            update((draft) => ({
              ...draft,
              salePriceCents: parseCurrencyInput(event.target.value),
            }))
          }
          value={sale.salePriceCents ? formatCents(sale.salePriceCents) : ""}
        />
      </Field>
      <Field label="Origem da venda">
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
          <option value="lead">Lead</option>
          <option value="walk_in">Loja fisica</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="marketplace">Marketplace</option>
          <option value="custom">Outro</option>
        </select>
      </Field>
    </Section>
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
  return (
    <Section title="Pagamentos">
      <div className="flex flex-col gap-3 md:col-span-2">
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
          className="sales-secondary-button"
          onClick={addPayment}
          type="button"
        >
          <Plus className="size-4" />
          Adicionar pagamento
        </button>
      </div>
    </Section>
  );
}

export function DocumentsSection({ sale, update }: SectionProps) {
  const required = requiredDocumentKinds(sale).length
    ? requiredDocumentKinds(sale)
    : defaultRequiredDocumentKinds;
  return (
    <Section title="Documentos">
      <div className="grid gap-2 md:col-span-2">
        {required.map((kind) => {
          const checked = sale.selectedDocumentKinds.includes(kind);
          return (
            <label className="sales-check-row" key={kind}>
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
              <span>{kind}</span>
            </label>
          );
        })}
      </div>
    </Section>
  );
}

type SectionProps = { sale: SaleRecord; update: UpdateSale };

function Section({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="rounded-lg border border-line bg-panel p-4">
      <h3 className="text-sm font-black text-app-text">{title}</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="grid gap-1 text-xs font-black text-muted">
      {label}
      {children}
    </label>
  );
}

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
