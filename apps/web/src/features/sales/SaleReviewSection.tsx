import { Car, Check, Coins, FileText, User } from "lucide-react";
import { formatCents, paymentPrincipalTotal } from "./salesModel";
import type { SaleRecord } from "./types";

export function ReviewSection({ sale }: { sale: SaleRecord }) {
  const totalPaid = paymentPrincipalTotal(sale);
  const salePrice = sale.salePriceCents ?? 0;
  const balance = salePrice - totalPaid;

  return (
    <div className="flex flex-col gap-4">
      <section className="sales-glass-panel p-5 bg-panel border border-line">
        <div className="flex items-center gap-2 border-b border-line/50 pb-3 mb-4">
          <Check className="size-4.5 text-emerald-500" />
          <h3 className="text-sm font-black text-app-text uppercase tracking-wider">
            Revisão dos Dados da Venda
          </h3>
        </div>

        <div className="grid gap-4">
          <div className="sales-glass-panel p-4 bg-app-elevated/20 border border-line grid gap-3">
            <h4 className="text-xs font-black text-app-text flex items-center gap-1.5 uppercase tracking-wider border-b border-line/40 pb-2">
              <User className="size-4 text-accent" />
              <span>Cliente Comprador</span>
            </h4>
            <div className="grid gap-3 sm:grid-cols-3 text-xs font-bold">
              <div>
                <span className="text-muted block text-[10px] uppercase">
                  Nome
                </span>
                <span className="text-app-text block mt-0.5">
                  {String(
                    (sale.buyerSnapshot.name as string | undefined) ||
                      "Não informado",
                  )}
                </span>
              </div>
              <div>
                <span className="text-muted block text-[10px] uppercase">
                  Telefone
                </span>
                <span className="text-app-text block mt-0.5">
                  {String(
                    (sale.buyerSnapshot.phone as string | undefined) ||
                      "Não informado",
                  )}
                </span>
              </div>
              <div>
                <span className="text-muted block text-[10px] uppercase">
                  E-mail
                </span>
                <span className="text-app-text block mt-0.5">
                  {String(
                    (sale.buyerSnapshot.email as string | undefined) ||
                      "Não informado",
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="sales-glass-panel p-4 bg-app-elevated/20 border border-line grid gap-3">
            <h4 className="text-xs font-black text-app-text flex items-center gap-1.5 uppercase tracking-wider border-b border-line/40 pb-2">
              <Car className="size-4 text-accent" />
              <span>Veículo Vinculado</span>
            </h4>
            <div className="grid gap-3 sm:grid-cols-3 text-xs font-bold">
              <div>
                <span className="text-muted block text-[10px] uppercase">
                  Veículo
                </span>
                <span className="text-app-text block mt-0.5">
                  {String(
                    (sale.listingSnapshot.title as string | undefined) ||
                      "Rascunho sem título",
                  )}
                </span>
              </div>
              <div>
                <span className="text-muted block text-[10px] uppercase">
                  Unidade
                </span>
                <span className="text-app-text block mt-0.5">
                  {String(sale.listingSnapshot.unitLabel || "Não informado")}
                </span>
              </div>
              <div>
                <span className="text-muted block text-[10px] uppercase">
                  Vendedor
                </span>
                <span className="text-app-text block mt-0.5">
                  {String(sale.sellerUserId ? "Definido" : "Não informado")}
                </span>
              </div>
            </div>
          </div>

          <div className="sales-glass-panel p-4 bg-app-elevated/20 border border-line grid gap-3">
            <h4 className="text-xs font-black text-app-text flex items-center gap-1.5 uppercase tracking-wider border-b border-line/40 pb-2">
              <Coins className="size-4 text-accent" />
              <span>Composição Financeira</span>
            </h4>
            <div className="grid gap-3 sm:grid-cols-3 text-xs font-bold">
              <div>
                <span className="text-muted block text-[10px] uppercase">
                  Preço Combinado
                </span>
                <span className="text-app-text block mt-0.5 text-sm font-black">
                  {sale.salePriceCents
                    ? formatCents(sale.salePriceCents)
                    : "Pendente"}
                </span>
              </div>
              <div>
                <span className="text-muted block text-[10px] uppercase">
                  Total em Pagamentos
                </span>
                <span className="text-emerald-500 block mt-0.5 text-sm font-black">
                  {formatCents(totalPaid)}
                </span>
              </div>
              <div>
                <span className="text-muted block text-[10px] uppercase">
                  Diferença
                </span>
                {totalPaid >= salePrice ? (
                  <span className="text-emerald-500 block mt-0.5 font-black uppercase tracking-wider text-[11px] flex items-center gap-1">
                    <Check className="size-3" /> Quitada
                  </span>
                ) : (
                  <span className="text-rose-500 block mt-0.5 text-sm font-black">
                    {formatCents(balance)} restante
                  </span>
                )}
              </div>
            </div>

            {sale.payments.length > 0 && (
              <div className="mt-2 pt-3 border-t border-line/30 flex flex-col gap-2">
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                  Parcelas Lançadas
                </span>
                {sale.payments.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex justify-between items-center text-xs bg-app-elevated/40 px-3 py-2 rounded-lg border border-line/40 font-bold"
                  >
                    <span className="text-app-text">
                      Parcela #{idx + 1} ({p.method.toUpperCase()})
                    </span>
                    <span className="text-app-text font-black">
                      {formatCents(p.principalCents)}{" "}
                      {p.extraCents > 0
                        ? `+ ${formatCents(p.extraCents)} extra`
                        : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="sales-glass-panel p-4 bg-app-elevated/20 border border-line grid gap-3">
            <h4 className="text-xs font-black text-app-text flex items-center gap-1.5 uppercase tracking-wider border-b border-line/40 pb-2">
              <FileText className="size-4 text-accent" />
              <span>Documentação Anexada</span>
            </h4>
            {sale.selectedDocumentKinds.length === 0 ? (
              <p className="text-xs font-bold text-rose-500">
                Nenhum documento selecionado para emissão.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {sale.selectedDocumentKinds.map((k) => (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 px-2.5 py-1 rounded-lg text-xs font-black"
                  >
                    <Check className="size-3" />
                    {formatDocumentKindLabel(k)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
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
