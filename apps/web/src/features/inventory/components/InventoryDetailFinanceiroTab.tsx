import { useState } from "react";
import { FileSpreadsheet, CheckCircle2, Sparkles } from "lucide-react";
import { NotesBlockField } from "./NotesBlockField";
import { FinanceiroCustosSection } from "./FinanceiroCustosSection";
import { FinanceiroCashFlowSection } from "./FinanceiroCashFlowSection";
import { VehicleAcquisitionCard } from "./VehicleAcquisitionCard";
import type { InventoryApi } from "../api/apiClient";
import type { InventoryUnit } from "../model/types";
import type { CostItem } from "./FinanceiroCustosSection";
import type { TransactionItem } from "./FinanceiroCashFlowSection";

export function InventoryDetailFinanceiroTab({
  api,
  listingId,
  unit,
}: {
  api: InventoryApi;
  listingId: string;
  unit: InventoryUnit | null;
}) {
  const [financials] = useState({
    entrada: 12000000, // R$ 120.000
    venda: 15000000, // R$ 150.000
    minimo: 14500000, // R$ 145.000
    despesas: 500000, // R$ 5.000
  });

  const [obs, setObs] = useState({
    veiculo: "Parachoques necessitam retoques e polimento.",
    etiqueta: "Laudo Dekra aprovado com apontamento de pintura.",
    servico: "Revisão de óleo e filtros agendada para sexta-feira.",
  });

  const [costs, setCosts] = useState<CostItem[]>([
    { id: "c1", account: "Higienização", status: "Pago", value: 35000 },
    { id: "c2", account: "Mecânica", status: "Pendente", value: 150000 },
  ]);

  const [nfe, setNfe] = useState<{
    status: string;
    date: string;
  } | null>(null);

  const formatBRL = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const handleAddCost = (
    account: string,
    value: number,
    status: "Pago" | "Pendente",
  ) => {
    const newCost: CostItem = {
      id: "cost-" + Date.now(),
      account,
      status,
      value,
    };
    setCosts((prev) => [...prev, newCost]);
  };

  const handleDeleteCost = (id: string) => {
    setCosts((prev) => prev.filter((c) => c.id !== id));
  };

  const handleEmitNfe = () => {
    setNfe({
      status: "Emitida",
      date: new Date().toLocaleDateString("pt-BR"),
    });
  };

  const totalCostsSum = costs.reduce((acc, curr) => acc + curr.value, 0);
  const totalDespesas = financials.despesas + totalCostsSum;
  const resultadoEsperado =
    financials.venda - financials.entrada - totalDespesas;
  const margemPercentual =
    financials.venda > 0 ? (resultadoEsperado / financials.venda) * 100 : 0;

  const initialCashFlow: TransactionItem[] = [
    {
      id: "cf-1",
      date: "11/06/2026",
      description: "Compra de Veículo - Aquisição",
      origin: "Estoque",
      value: -financials.entrada,
      status: "Pago",
    },
  ];

  const cashFlowCosts = costs.map((c) => ({
    id: `cf-cost-${c.id}`,
    date: "12/06/2026",
    description: `Despesa: ${c.account}`,
    origin: c.account,
    value: -c.value,
    status: c.status,
  }));

  const cashFlowItems = [...initialCashFlow, ...cashFlowCosts];

  return (
    <div className="flex flex-col gap-8 w-full max-w-none text-app-text">
      {/* 3-Column Top Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        {/* Card 1: Resumo Financeiro */}
        <div className="bg-panel border border-line rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider border-b border-line pb-3 mb-4">
              Resumo Financeiro
            </h3>
            <div className="flex flex-col gap-3">
              {[
                { label: "Valor de Entrada", value: financials.entrada },
                { label: "Valor de Venda", value: financials.venda },
                { label: "Valor Mínimo", value: financials.minimo },
                { label: "Despesas Loja", value: totalDespesas },
              ].map((row, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center text-xs font-bold border-b border-line/30 pb-2.5"
                >
                  <span className="text-muted">{row.label}</span>
                  <span className="text-app-text font-black">
                    {formatBRL(row.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-accent-soft/30 border border-accent-soft/20 flex flex-col gap-1.5">
            <span className="text-xs font-black uppercase tracking-wider text-muted">
              Resultado Esperado
            </span>
            <div className="flex justify-between items-baseline">
              <span className="text-lg font-black text-accent-strong">
                {formatBRL(resultadoEsperado)}
              </span>
              <span className="text-xs font-black text-emerald-500">
                {margemPercentual.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Dados de Entrada & Observações */}
        <div className="bg-panel border border-line rounded-2xl p-5 flex flex-col gap-4">
          <h3 className="text-sm font-black uppercase tracking-wider border-b border-line pb-3">
            Dados de Entrada
          </h3>
          <div className="grid grid-cols-2 gap-4 text-xs font-bold">
            <div>
              <span className="block text-xs uppercase tracking-wider text-muted">
                Data de Entrada
              </span>
              <span className="text-app-text">11/06/2026</span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-wider text-muted">
                Quilometragem
              </span>
              <span className="text-app-text">32.500 km</span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-wider text-muted">
                Modalidade
              </span>
              <span className="text-app-text">Estoque Próprio</span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-wider text-muted">
                Loja
              </span>
              <span className="text-app-text">Matriz</span>
            </div>
          </div>

          <div className="border-t border-line/60 pt-4 flex flex-col gap-3">
            <span className="text-xs font-black uppercase tracking-wider text-muted mb-1 block">
              Observações
            </span>
            <NotesBlockField
              label="Veículo"
              value={obs.veiculo}
              onSave={(val) => setObs((prev) => ({ ...prev, veiculo: val }))}
            />
            <NotesBlockField
              label="Etiqueta"
              value={obs.etiqueta}
              onSave={(val) => setObs((prev) => ({ ...prev, etiqueta: val }))}
            />
            <NotesBlockField
              label="Serviço"
              value={obs.servico}
              onSave={(val) => setObs((prev) => ({ ...prev, servico: val }))}
            />
          </div>
        </div>

        <VehicleAcquisitionCard api={api} listingId={listingId} unit={unit} />
      </div>

      {/* Section 1: Custos */}
      <FinanceiroCustosSection
        costs={costs}
        onAddCost={handleAddCost}
        onDeleteCost={handleDeleteCost}
        formatBRL={formatBRL}
      />

      {/* Section 2: Notas Fiscais */}
      <div className="bg-panel border border-line rounded-2xl p-5 flex flex-col gap-4">
        <h3 className="text-sm font-black uppercase tracking-wider border-b border-line pb-3">
          Notas Fiscais
        </h3>

        {nfe ? (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.03] text-xs font-bold">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <CheckCircle2 className="size-4.5" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-app-text font-black">
                  Nota de entrada emitida
                </span>
                <span className="text-muted mt-0.5">
                  Nota Fiscal Eletrônica de Entrada emitida com sucesso.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div>
                <span className="block text-xs uppercase tracking-wider text-muted">
                  Data de Emissão
                </span>
                <span className="text-app-text">{nfe.date}</span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider text-muted">
                  Status SEFAZ
                </span>
                <span className="text-emerald-500 font-black">Autorizada</span>
              </div>
              <button
                onClick={() => setNfe(null)}
                className="min-h-9 rounded-lg border border-line px-3 text-xs font-black hover:bg-line/25 transition-all text-danger cursor-pointer ml-2"
                type="button"
              >
                Remover / Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center flex flex-col items-center justify-center bg-app/10 border border-line border-dashed rounded-xl gap-3">
            <FileSpreadsheet className="size-8 text-muted animate-none" />
            <div>
              <p className="text-xs font-black text-app-text">
                Nenhuma Nota Fiscal emitida para este veículo.
              </p>
              <p className="text-xs text-muted font-bold mt-1">
                Emita a NF-e de entrada ou saída para autorização na SEFAZ.
              </p>
            </div>
            <button
              onClick={handleEmitNfe}
              className="mt-2 min-h-9 rounded-lg bg-accent text-inverse font-black text-xs hover:bg-accent-strong transition-all cursor-pointer px-4 flex items-center justify-center gap-1.5"
              type="button"
            >
              <Sparkles className="size-3.5 animate-none" />
              <span>Emitir NF-e</span>
            </button>
          </div>
        )}
      </div>

      {/* Section 3: Fluxo de Caixa */}
      <FinanceiroCashFlowSection items={cashFlowItems} formatBRL={formatBRL} />
    </div>
  );
}
