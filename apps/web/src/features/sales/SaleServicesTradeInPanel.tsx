import { Check, RefreshCw } from "lucide-react";
import { SaleField } from "./SaleWorkspaceForm";
import { formatCurrency, parseCurrency } from "./saleServicesFormat";
import { snapshotBoolean, snapshotNumber } from "./salesSnapshot";
import type { ServiceChangeHandler } from "./SaleServicesTypes";
import type { SnapshotRecord } from "./salesSnapshot";
import type { SaleRecord } from "./types";

export function TradeInPanel({
  onChange,
  sale,
  tradeIn,
}: {
  onChange: ServiceChangeHandler;
  sale: SaleRecord;
  tradeIn: SnapshotRecord;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-line pb-2 mb-1">
        <h4 className="text-xs font-black text-app-text uppercase tracking-wider flex items-center gap-1.5">
          <RefreshCw className="size-4.5 text-accent" />
          <span>Veículo na Troca (Trade-in)</span>
        </h4>

        <label className="flex items-center gap-2 cursor-pointer font-black text-xs uppercase text-app-text select-none">
          <input
            checked={snapshotBoolean(tradeIn.enabled)}
            className="accent-accent scale-110"
            onChange={(event) =>
              onChange("tradeIn", "enabled", event.target.checked)
            }
            type="checkbox"
          />
          <span>Habilitar Troca</span>
        </label>
      </div>

      {snapshotBoolean(tradeIn.enabled) ? (
        <TradeInFields onChange={onChange} sale={sale} tradeIn={tradeIn} />
      ) : (
        <div className="rounded-xl border border-dashed border-line p-8 text-center text-xs font-bold text-muted flex flex-col items-center justify-center gap-2">
          <RefreshCw className="size-8 text-muted/30" />
          <span>Esta venda não possui veículo como parte de pagamento.</span>
          <button
            className="sales-secondary-button mt-2 text-xs"
            onClick={() => onChange("tradeIn", "enabled", true)}
            type="button"
          >
            Habilitar Troca de Veículo
          </button>
        </div>
      )}
    </div>
  );
}

function TradeInFields({
  onChange,
  sale,
  tradeIn,
}: {
  onChange: ServiceChangeHandler;
  sale: SaleRecord;
  tradeIn: SnapshotRecord;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs font-bold text-emerald-600 flex flex-col gap-1.5 shadow-inner">
        <span className="uppercase tracking-wider font-black flex items-center gap-1 text-emerald-700">
          <Check className="size-3.5" /> Cadastro Automático Ativo
        </span>
        <span>
          Ao fechar esta venda, este veículo será{" "}
          <strong>auto-cadastrado</strong> no inventário e o cliente atual{" "}
          <strong>{String(sale.buyerSnapshot.name || "Comprador")}</strong> será
          configurado como fornecedor de aquisição.
        </span>
      </div>

      <TradeInInput
        field="brand"
        label="Marca / Fabricante"
        onChange={onChange}
        placeholder="Ex: Porsche, BMW, Chevrolet..."
        tradeIn={tradeIn}
      />
      <TradeInInput
        field="model"
        label="Modelo / Versão"
        onChange={onChange}
        placeholder="Ex: Macan GTS, 320i, Onix..."
        tradeIn={tradeIn}
      />
      <TradeInInput
        field="plate"
        label="Placa"
        onChange={onChange}
        placeholder="Ex: ABC-1234 ou BRA2E19"
        tradeIn={tradeIn}
      />
      <TradeInInput
        field="color"
        label="Cor do Veículo"
        onChange={onChange}
        placeholder="Ex: Preto Obsidian, Branco Metalico..."
        tradeIn={tradeIn}
      />
      <TradeInInput
        field="yearFabrication"
        label="Ano Fabricação"
        onChange={onChange}
        placeholder="Ex: 2024"
        tradeIn={tradeIn}
        type="number"
      />
      <TradeInInput
        field="yearModel"
        label="Ano Modelo"
        onChange={onChange}
        placeholder="Ex: 2025"
        tradeIn={tradeIn}
        type="number"
      />
      <TradeInInput
        field="renavam"
        label="Renavam"
        onChange={onChange}
        placeholder="Ex: 11 dígitos"
        tradeIn={tradeIn}
      />
      <TradeInInput
        field="chassi"
        label="Chassi"
        onChange={onChange}
        placeholder="Ex: 17 caracteres"
        tradeIn={tradeIn}
      />

      <div className="md:col-span-2">
        <SaleField label="Valor de Avaliação / Entrada">
          <input
            className="sales-input text-lg font-black text-accent-strong"
            onChange={(event) =>
              onChange(
                "tradeIn",
                "valuationCents",
                parseCurrency(event.target.value),
              )
            }
            placeholder="R$ 0,00"
            value={formatCurrency(snapshotNumber(tradeIn.valuationCents))}
          />
        </SaleField>
      </div>
    </div>
  );
}

function TradeInInput({
  field,
  label,
  onChange,
  placeholder,
  tradeIn,
  type = "text",
}: {
  field: string;
  label: string;
  onChange: ServiceChangeHandler;
  placeholder: string;
  tradeIn: SnapshotRecord;
  type?: "number" | "text";
}) {
  return (
    <SaleField label={label}>
      <input
        className="sales-input"
        onChange={(event) => onChange("tradeIn", field, event.target.value)}
        placeholder={placeholder}
        type={type}
        value={String(tradeIn[field] ?? "")}
      />
    </SaleField>
  );
}
