import { useState } from "react";
import { Filter, Plus, Trash2, DollarSign, Sparkles } from "lucide-react";

const costStatuses = ["Pago", "Pendente"] as const;
const costFilterStatuses = ["Todos", ...costStatuses] as const;

type CostStatus = (typeof costStatuses)[number];
type CostFilterStatus = (typeof costFilterStatuses)[number];

export interface CostItem {
  id: string;
  account: string;
  status: CostStatus;
  value: number;
}

interface FinanceiroCustosSectionProps {
  costs: CostItem[];
  onAddCost: (account: string, value: number, status: CostStatus) => void;
  onDeleteCost: (id: string) => void;
  formatBRL: (cents: number) => string;
}

export function FinanceiroCustosSection({
  costs,
  onAddCost,
  onDeleteCost,
  formatBRL,
}: FinanceiroCustosSectionProps) {
  const [costAccount, setCostAccount] = useState("Higienização");
  const [costValue, setCostValue] = useState("350");
  const [costStatus, setCostStatus] = useState<CostStatus>("Pago");
  const [costFilterStatus, setCostFilterStatus] =
    useState<CostFilterStatus>("Todos");
  const [costFilterAccount] = useState("Todos"); // placeholder or default

  const handleAddCost = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanValue = parseFloat(costValue.replace(/[^0-9.-]+/g, "")) * 100;
    if (isNaN(cleanValue) || cleanValue <= 0 || !costAccount) return;

    onAddCost(costAccount, cleanValue, costStatus);
    setCostValue("");
  };

  const filteredCosts = costs.filter((c) => {
    const matchStatus =
      costFilterStatus === "Todos" || c.status === costFilterStatus;
    const matchAccount =
      costFilterAccount === "Todos" || c.account === costFilterAccount;
    return matchStatus && matchAccount;
  });

  const totalCostsSum = filteredCosts.reduce(
    (acc, curr) => acc + curr.value,
    0,
  );

  const selectCostFilterStatus = (value: string) => {
    if (costFilterStatuses.includes(value as CostFilterStatus)) {
      setCostFilterStatus(value as CostFilterStatus);
    }
  };

  const selectCostStatus = (value: string) => {
    if (costStatuses.includes(value as CostStatus)) {
      setCostStatus(value as CostStatus);
    }
  };

  return (
    <div className="bg-panel border border-line rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-black uppercase tracking-wider">
            Custos
          </h3>
          <span className="bg-accent-soft text-accent-strong text-xs font-black px-2 py-0.5 rounded-full">
            {costs.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-muted border-r border-line pr-3">
            <Filter className="size-3.5" />
            <span>Status:</span>
            <select
              value={costFilterStatus}
              onChange={(e) => selectCostFilterStatus(e.target.value)}
              className="bg-app-elevated border border-line rounded px-1.5 py-0.5 text-xs font-bold outline-none"
            >
              {costFilterStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={handleAddCost} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Ex: Pintura"
              value={costAccount}
              onChange={(e) => setCostAccount(e.target.value)}
              className="min-h-8 rounded-lg border border-line bg-app px-2 text-xs font-bold outline-none w-28"
              required
            />
            <input
              type="number"
              placeholder="R$ Valor"
              value={costValue}
              onChange={(e) => setCostValue(e.target.value)}
              className="min-h-8 rounded-lg border border-line bg-app px-2 text-xs font-bold outline-none w-20"
              required
            />
            <select
              value={costStatus}
              onChange={(e) => selectCostStatus(e.target.value)}
              className="min-h-8 rounded-lg border border-line bg-app px-2 text-xs font-bold outline-none"
            >
              {costStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="min-h-8 rounded-lg bg-accent text-inverse font-black text-xs hover:bg-accent-strong transition-all cursor-pointer px-3.5 flex items-center gap-1"
            >
              <Plus className="size-3.5" />
              <span>Adicionar</span>
            </button>
          </form>
        </div>
      </div>

      {filteredCosts.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-bold">
              <thead>
                <tr className="border-b border-line text-muted uppercase text-xs tracking-wider">
                  <th className="py-2">Conta / Descrição</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Valor</th>
                  <th className="py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredCosts.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-line/30 hover:bg-app/10 transition-colors"
                  >
                    <td className="py-3 text-app-text font-black">
                      {c.account}
                    </td>
                    <td className="py-3">
                      <span
                        className={
                          "text-xs font-black px-2.5 py-0.5 rounded-full border " +
                          (c.status === "Pago"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/25"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/25")
                        }
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 text-right font-black text-app-text">
                      {formatBRL(c.value)}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => onDeleteCost(c.id)}
                        className="p-1 rounded bg-transparent hover:bg-danger/10 text-muted hover:text-danger cursor-pointer transition-all"
                        title="Excluir custo"
                        type="button"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center border-t border-line pt-3 mt-1 bg-app/5 p-3.5 rounded-xl">
            <span className="text-xs font-black text-muted uppercase tracking-wider">
              Soma dos Custos
            </span>
            <span className="text-sm font-black text-accent-strong">
              {formatBRL(totalCostsSum)}
            </span>
          </div>
        </div>
      ) : (
        <div className="py-12 text-center flex flex-col items-center justify-center bg-app/10 border border-line border-dashed rounded-xl gap-3">
          <DollarSign className="size-8 text-muted" />
          <div>
            <p className="text-xs font-black text-app-text">
              Nenhum custo registrado com este filtro.
            </p>
            <p className="text-xs text-muted font-bold mt-1">
              Insira uma descrição e valor acima para cadastrar novos gastos.
            </p>
          </div>
          <button
            onClick={() => {
              onAddCost("Polimento", 25000, "Pago");
            }}
            className="mt-2 min-h-8 rounded-lg bg-accent/15 border border-accent/25 text-accent-strong font-black text-xs hover:bg-accent/25 cursor-pointer px-4 flex items-center gap-1.5"
            type="button"
          >
            <Sparkles className="size-3.5" />
            <span>Adicionar Custo Inicial (Demo)</span>
          </button>
        </div>
      )}
    </div>
  );
}
