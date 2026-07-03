import { useState } from "react";
import { Filter, Plus, DollarSign } from "lucide-react";
import type { InventoryCostKind } from "../model/types";
import { InventorySelect } from "./InventoryFormParts";

const costKindOptions = [
  "acquisition",
  "preparation",
  "repair",
  "fee",
  "tax",
  "transport",
  "other",
] as const satisfies readonly InventoryCostKind[];
const costFilterKinds = ["Todos", ...costKindOptions] as const;

type CostFilterKind = (typeof costFilterKinds)[number];

export interface CostItem {
  id: string;
  account: string;
  date: string;
  kind: InventoryCostKind;
  kindLabel: string;
  value: number;
}

interface FinanceiroCustosSectionProps {
  addStatus?: string | null;
  costs: readonly CostItem[];
  formatBRL: (cents: number) => string;
  isAdding?: boolean;
  onAddCost: (account: string, value: number, kind: InventoryCostKind) => void;
}

export function FinanceiroCustosSection({
  addStatus,
  costs,
  formatBRL,
  isAdding = false,
  onAddCost,
}: FinanceiroCustosSectionProps) {
  const [costAccount, setCostAccount] = useState("");
  const [costValue, setCostValue] = useState("");
  const [costKind, setCostKind] = useState<InventoryCostKind>("preparation");
  const [costFilterKind, setCostFilterKind] = useState<CostFilterKind>("Todos");

  const handleAddCost = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanValue = parseFloat(costValue.replace(/[^0-9.-]+/g, "")) * 100;
    if (isNaN(cleanValue) || cleanValue <= 0 || !costAccount) return;

    onAddCost(costAccount, cleanValue, costKind);
    setCostAccount("");
    setCostValue("");
  };

  const filteredCosts = costs.filter((c) => {
    return costFilterKind === "Todos" || c.kind === costFilterKind;
  });

  const totalCostsSum = filteredCosts.reduce(
    (acc, curr) => acc + curr.value,
    0,
  );

  const selectCostFilterKind = (value: string) => {
    if (costFilterKinds.includes(value as CostFilterKind)) {
      setCostFilterKind(value as CostFilterKind);
    }
  };

  const selectCostKind = (value: string) => {
    if (costKindOptions.includes(value as InventoryCostKind)) {
      setCostKind(value as InventoryCostKind);
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
            <span>Tipo:</span>
            <InventorySelect
              ariaLabel="Filtrar custos por tipo"
              className="min-h-8 px-2 py-0 text-xs"
              value={costFilterKind}
              onChange={selectCostFilterKind}
              options={costFilterKinds.map((kind) => ({
                label: kind === "Todos" ? kind : costKindLabel(kind),
                value: kind,
              }))}
            />
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
            <InventorySelect
              ariaLabel="Tipo do custo"
              className="min-h-8 px-2 text-xs"
              value={costKind}
              onChange={selectCostKind}
              options={costKindOptions.map((kind) => ({
                label: costKindLabel(kind),
                value: kind,
              }))}
            />
            <button
              disabled={isAdding}
              type="submit"
              className="min-h-8 rounded-lg bg-accent text-inverse font-black text-xs hover:bg-accent-strong transition-all cursor-pointer px-3.5 flex items-center gap-1 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Plus className="size-3.5" />
              <span>{isAdding ? "Salvando" : "Adicionar"}</span>
            </button>
          </form>
        </div>
      </div>

      {addStatus ? (
        <div className="rounded-xl border border-line bg-app px-3 py-2 text-xs font-bold text-muted">
          {addStatus}
        </div>
      ) : null}

      {filteredCosts.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-bold">
              <thead>
                <tr className="border-b border-line text-muted uppercase text-xs tracking-wider">
                  <th className="py-2">Conta / Descrição</th>
                  <th className="py-2">Tipo</th>
                  <th className="py-2">Data</th>
                  <th className="py-2 text-right">Valor</th>
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
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-full border bg-app text-muted border-line">
                        {c.kindLabel}
                      </span>
                    </td>
                    <td className="py-3 text-muted">{c.date}</td>
                    <td className="py-3 text-right font-black text-app-text">
                      {formatBRL(c.value)}
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
        </div>
      )}
    </div>
  );
}

export function costKindLabel(kind: InventoryCostKind) {
  const labels: Record<InventoryCostKind, string> = {
    acquisition: "Aquisição",
    fee: "Taxa",
    other: "Outro",
    preparation: "Preparação",
    repair: "Reparo",
    tax: "Imposto",
    transport: "Transporte",
  };
  return labels[kind];
}
