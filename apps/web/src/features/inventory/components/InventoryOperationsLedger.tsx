import { CircleDollarSign, History, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { InventoryApi } from "../api/apiClient";
import { parsePriceCents } from "../model/formModel";
import {
  InventoryField,
  InventoryInput,
  InventoryPanel,
  InventorySelect,
  InventoryTextarea,
} from "./InventoryFormParts";
import type { InventoryCostKind, InventoryListingDetail } from "../model/types";

const costKinds: { label: string; value: InventoryCostKind }[] = [
  { label: "Aquisicao", value: "acquisition" },
  { label: "Preparacao", value: "preparation" },
  { label: "Reparo", value: "repair" },
  { label: "Transporte", value: "transport" },
  { label: "Taxa", value: "fee" },
  { label: "Imposto", value: "tax" },
  { label: "Outro", value: "other" },
];

export function InventoryOperationsLedger({
  api,
  detail,
  onUpdated,
}: {
  api: InventoryApi;
  detail: InventoryListingDetail;
  onUpdated: (detail: InventoryListingDetail) => void;
}) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<InventoryCostKind>("preparation");
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const primaryUnit = detail.units[0] ?? null;
  const costTotal = detail.costs.reduce(
    (total, cost) => total + cost.amountCents,
    0,
  );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amountCents = parsePriceCents(amount);
    if (!amountCents || !primaryUnit) {
      setState("error");
      return;
    }
    setState("saving");
    try {
      const updated = await api.addCost(detail.listing.id, {
        amountCents,
        description: description.trim() || null,
        kind,
        unitId: primaryUnit.id,
      });
      setAmount("");
      setDescription("");
      setState("idle");
      onUpdated(updated);
    } catch {
      setState("error");
    }
  };

  return (
    <InventoryPanel
      icon={<CircleDollarSign className="size-5" />}
      title="Operacoes"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid gap-3">
          <Metric label="Custos" value={formatMoney(costTotal)} />
          <HistoryList
            items={[
              ...detail.priceHistory.map((item) => ({
                id: item.id,
                text: `Preco ${formatMoney(item.oldPriceCents)} -> ${formatMoney(item.newPriceCents)}`,
                time: item.changedAt,
              })),
              ...detail.statusHistory.map((item) => ({
                id: item.id,
                text: `${item.target}: ${item.fromStatus ?? "-"} -> ${item.toStatus}`,
                time: item.changedAt,
              })),
            ]}
          />
        </div>
        <form className="grid gap-3" onSubmit={(event) => void submit(event)}>
          <InventoryField label="Tipo de custo">
            <InventorySelect
              onChange={setKind}
              options={costKinds}
              value={kind}
            />
          </InventoryField>
          <InventoryField label="Valor">
            <InventoryInput
              inputMode="decimal"
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0,00"
              value={amount}
            />
          </InventoryField>
          <InventoryField label="Descricao">
            <InventoryTextarea
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Origem do custo"
              value={description}
            />
          </InventoryField>
          <button
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-black text-inverse disabled:opacity-70"
            disabled={state === "saving" || !primaryUnit}
            type="submit"
          >
            <Plus aria-hidden="true" className="size-4" />
            Adicionar custo
          </button>
          {state === "error" ? (
            <p className="text-sm font-black text-danger">
              Verifique unidade e valor.
            </p>
          ) : null}
        </form>
      </div>
    </InventoryPanel>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-app p-3">
      <p className="text-xs font-black uppercase text-muted">{label}</p>
      <p className="mt-1 text-xl font-black text-app-text">{value}</p>
    </div>
  );
}

function HistoryList({
  items,
}: {
  items: readonly { id: string; text: string; time: string }[];
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2 text-sm font-black">
        <History className="size-4 text-accent-strong" />
        Historico
      </div>
      {items.slice(0, 8).map((item) => (
        <div key={item.id} className="rounded-lg border border-line bg-app p-3">
          <p className="text-sm font-black text-app-text">{item.text}</p>
          <p className="text-xs font-bold text-muted">
            {new Date(item.time).toLocaleString("pt-BR")}
          </p>
        </div>
      ))}
      {items.length === 0 ? (
        <p className="text-sm font-bold text-muted">Sem operacoes ainda.</p>
      ) : null}
    </div>
  );
}

function formatMoney(value: number | null): string {
  return ((value ?? 0) / 100).toLocaleString("pt-BR", {
    currency: "BRL",
    style: "currency",
  });
}
