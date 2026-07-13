import { useState } from "react";
import { Filter, Plus, DollarSign, Paperclip, Upload } from "lucide-react";
import type { InventoryCostKind } from "../model/types";
import {
  InventorySelect,
  InventoryField,
  InventoryInput,
} from "./InventoryFormParts";
import {
  costFilterKinds,
  costKindLabel,
  costKindOptions,
  type CostFilterKind,
  type FinanceiroCustosSectionProps,
} from "./FinanceiroCustosSectionModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";

export function FinanceiroCustosSection({
  addStatus,
  clearStatus,
  costs,
  formatBRL,
  isAdding = false,
  onAddCost,
  onDownloadReceipt,
}: FinanceiroCustosSectionProps) {
  const [costAccount, setCostAccount] = useState("");
  const [costValue, setCostValue] = useState("");
  const [costKind, setCostKind] = useState<InventoryCostKind>("preparation");
  const [costFilterKind, setCostFilterKind] = useState<CostFilterKind>("Todos");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [costFile, setCostFile] = useState<File | null>(null);

  const handleAddCost = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanValue = parseFloat(costValue.replace(/[^0-9.-]+/g, "")) * 100;
    if (isNaN(cleanValue) || cleanValue <= 0 || !costAccount) return;

    const success = await onAddCost(
      costAccount,
      cleanValue,
      costKind,
      costFile,
    );
    if (success) {
      setCostAccount("");
      setCostValue("");
      setCostFile(null);
      setIsModalOpen(false);
    }
  };

  const handleOpenModal = () => {
    clearStatus?.();
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    clearStatus?.();
    setCostFile(null);
    setIsModalOpen(false);
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

          <button
            onClick={handleOpenModal}
            type="button"
            className="min-h-8 rounded-lg bg-accent text-inverse font-black text-xs hover:bg-accent-strong transition-all cursor-pointer px-3.5 flex items-center gap-1"
          >
            <Plus className="size-3.5" />
            <span>Novo Custo</span>
          </button>
        </div>
      </div>

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
                      <div className="flex items-center gap-2">
                        <span>{c.account}</span>
                        {c.receipt ? (
                          <button
                            onClick={() => onDownloadReceipt?.(c.receipt!.id)}
                            type="button"
                            className="p-1 rounded bg-transparent hover:bg-line/25 text-muted hover:text-accent cursor-pointer transition-all flex items-center justify-center"
                            title={`Visualizar comprovante: ${c.receipt.fileName}`}
                          >
                            <Paperclip className="size-3.5 text-accent" />
                          </button>
                        ) : null}
                      </div>
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
              Clique em "Novo Custo" acima para cadastrar novos gastos.
            </p>
          </div>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-md" radius="xl" surface="panel">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-base font-black uppercase tracking-wider">
              Adicionar Novo Custo
            </DialogTitle>
            <DialogDescription className="text-xs text-muted font-bold">
              Registre um novo custo ou despesa associada a este veículo.
            </DialogDescription>
          </DialogHeader>

          {addStatus ? (
            <div className="bg-accent-soft/20 border border-accent-soft text-accent-strong text-xs font-bold rounded-lg p-2.5 mb-4">
              {addStatus}
            </div>
          ) : null}

          <form
            onSubmit={(e) => {
              void handleAddCost(e);
            }}
            className="grid gap-4"
          >
            <InventoryField label="Conta / Descrição" required>
              <InventoryInput
                disabled={isAdding}
                type="text"
                placeholder="Ex: Pintura do parachoque"
                value={costAccount}
                onChange={(e) => setCostAccount(e.target.value)}
                required
              />
            </InventoryField>

            <div className="grid gap-4 grid-cols-2">
              <InventoryField label="Valor (R$)" required>
                <InventoryInput
                  disabled={isAdding}
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={costValue}
                  onChange={(e) => setCostValue(e.target.value)}
                  required
                />
              </InventoryField>

              <InventoryField label="Tipo do Custo" required>
                <InventorySelect
                  disabled={isAdding}
                  ariaLabel="Tipo do custo"
                  value={costKind}
                  onChange={selectCostKind}
                  options={costKindOptions.map((kind) => ({
                    label: costKindLabel(kind),
                    value: kind,
                  }))}
                />
              </InventoryField>
            </div>

            <InventoryField label="Comprovante / Nota (Opcional)">
              <div className="flex items-center gap-2 mt-1">
                <label className="min-h-9 flex items-center justify-center gap-1.5 rounded-lg border border-line bg-app px-3.5 text-xs font-black text-app-text hover:bg-line/25 transition-all cursor-pointer">
                  <Upload className="size-3.5 text-muted" />
                  <span>
                    {costFile ? "Alterar Arquivo" : "Escolher Arquivo"}
                  </span>
                  <input
                    type="file"
                    disabled={isAdding}
                    accept="image/*,application/pdf,.doc,.docx"
                    className="sr-only"
                    onChange={(e) => setCostFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                {costFile ? (
                  <span
                    className="text-xs font-bold text-app-text truncate max-w-[200px]"
                    title={costFile.name}
                  >
                    {costFile.name}
                  </span>
                ) : (
                  <span className="text-xs font-bold text-muted">
                    Nenhum arquivo selecionado
                  </span>
                )}
              </div>
            </InventoryField>

            <DialogFooter
              className="flex gap-2 justify-end"
              divider
              paddingTop="md"
            >
              <button
                className="min-h-9 rounded-lg px-4 text-xs font-black border border-line text-app-text hover:bg-line/25 transition-all cursor-pointer"
                onClick={handleCloseModal}
                type="button"
                disabled={isAdding}
              >
                Cancelar
              </button>
              <button
                disabled={isAdding}
                type="submit"
                className="min-h-9 rounded-lg bg-accent text-inverse font-black text-xs hover:bg-accent-strong transition-all cursor-pointer px-4 flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Plus className="size-3.5" />
                <span>{isAdding ? "Salvando..." : "Confirmar"}</span>
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
