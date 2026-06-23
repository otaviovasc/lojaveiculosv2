import { ArrowUpRight, ArrowDownLeft, DollarSign } from "lucide-react";

export interface TransactionItem {
  id: string;
  date: string;
  description: string;
  origin: string;
  value: number;
  status: "Pago" | "Pendente";
}

interface FinanceiroCashFlowSectionProps {
  items: TransactionItem[];
  formatBRL: (cents: number) => string;
}

export function FinanceiroCashFlowSection({
  items,
  formatBRL,
}: FinanceiroCashFlowSectionProps) {
  const cashFlowEntradas = 0;
  const cashFlowSaidas = Math.abs(
    items.reduce((acc, curr) => acc + curr.value, 0),
  );

  return (
    <div className="bg-panel border border-line rounded-2xl p-5 flex flex-col gap-5">
      <div className="flex items-center justify-between border-b border-line pb-3.5">
        <h3 className="text-sm font-black uppercase tracking-wider">
          Fluxo de Caixa
        </h3>
        <span className="text-[10px] font-black text-muted uppercase tracking-widest bg-app-elevated border border-line px-2.5 py-1 rounded">
          Regime de Caixa
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-app/30 border border-line rounded-xl p-4 flex items-center gap-3">
          <div className="size-9 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 shrink-0 animate-none">
            <ArrowUpRight className="size-4.5" />
          </div>
          <div>
            <span className="block text-[9px] uppercase tracking-wider text-muted">
              Entradas
            </span>
            <span className="text-sm font-black text-emerald-500">
              {formatBRL(cashFlowEntradas)}
            </span>
          </div>
        </div>

        <div className="bg-app/30 border border-line rounded-xl p-4 flex items-center gap-3">
          <div className="size-9 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20 shrink-0 animate-none">
            <ArrowDownLeft className="size-4.5" />
          </div>
          <div>
            <span className="block text-[9px] uppercase tracking-wider text-muted">
              Saídas
            </span>
            <span className="text-sm font-black text-rose-500">
              {formatBRL(cashFlowSaidas)}
            </span>
          </div>
        </div>

        <div className="bg-app/30 border border-line rounded-xl p-4 flex items-center gap-3">
          <div className="size-9 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20 shrink-0 animate-none">
            <DollarSign className="size-4.5" />
          </div>
          <div>
            <span className="block text-[9px] uppercase tracking-wider text-muted">
              Saldo Líquido
            </span>
            <span className="text-sm font-black text-blue-500">
              -{formatBRL(cashFlowSaidas)}
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto mt-2">
        <table className="w-full text-left text-xs font-bold">
          <thead>
            <tr className="border-b border-line text-muted uppercase text-[9px] tracking-wider">
              <th className="py-2">Data</th>
              <th className="py-2">Descrição</th>
              <th className="py-2">Origem</th>
              <th className="py-2 text-right">Valor</th>
              <th className="py-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-b border-line/30 hover:bg-app/10 transition-colors"
              >
                <td className="py-3 text-muted">{item.date}</td>
                <td className="py-3 text-app-text font-black">
                  {item.description}
                </td>
                <td className="py-3 text-muted">{item.origin}</td>
                <td className="py-3 text-right font-black text-rose-500">
                  {formatBRL(item.value)}
                </td>
                <td className="py-3 text-right">
                  <span className="inline-flex items-center gap-1">
                    {item.status === "Pago" ? (
                      <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                    ) : (
                      <span className="size-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                    )}
                    <span
                      className={
                        item.status === "Pago"
                          ? "text-emerald-500 font-bold"
                          : "text-amber-500 font-bold"
                      }
                    >
                      {item.status}
                    </span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
