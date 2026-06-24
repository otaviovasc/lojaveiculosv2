import { Calculator, Sparkles } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import type {
  InventoryEditableField,
  InventoryFormState,
} from "../model/formModel";
import {
  formatCentsCurrency,
  formatCentsForInput,
  idealSellPriceCents,
  recommendedAcquisitionCents,
} from "../model/inventoryPricing";
import { InventoryField, InventoryInput } from "./InventoryFormParts";

export function InventoryCreateCostsSection({
  form,
  onChange,
}: {
  form: InventoryFormState;
  onChange: (
    field: InventoryEditableField,
  ) => (
    value: ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | string,
  ) => void;
}) {
  const fipePriceCents = form.catalog?.priceCents ?? null;
  const acquisitionCents = recommendedAcquisitionCents(fipePriceCents);
  const sellCents = idealSellPriceCents(fipePriceCents);
  const hasFipeReference = fipePriceCents !== null;
  const [showSuggestions, setShowSuggestions] = useState(false);

  return (
    <section className="glass-panel-branded flex flex-col gap-5 rounded-2xl border border-line bg-panel p-6 shadow-[var(--shadow-panel)]">
      <header className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-black uppercase tracking-wider text-app-text">
            Custos e Precificação
          </h3>
          <p className="text-xs font-bold text-muted">
            Defina o valor de aquisição (custo) e o valor anunciado. As
            sugestões FIPE ficam ocultas até você pedir.
          </p>
        </div>
        <button
          aria-pressed={showSuggestions}
          className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-lg border border-accent-soft/30 bg-accent-soft px-3 text-xs font-black text-accent-strong transition-colors hover:bg-accent-soft/70 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
          disabled={!hasFipeReference}
          onClick={() => setShowSuggestions((current) => !current)}
          type="button"
        >
          <Sparkles aria-hidden="true" className="size-4" />
          <span>
            {showSuggestions ? "Ocultar sugestões FIPE" : "Ver sugestões FIPE"}
          </span>
        </button>
      </header>

      <div className="rounded-xl border border-line bg-app p-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-black uppercase tracking-wide text-muted">
            Referência FIPE selecionada
          </span>
          <strong className="text-base font-black text-app-text">
            {formatCentsCurrency(fipePriceCents)}
          </strong>
          <span className="text-xs font-bold text-muted">
            {form.catalog?.referenceMonth ??
              "Selecione marca, modelo, versão e ano para carregar a FIPE."}
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <InventoryField label="Valor de aquisição *">
          <InventoryInput
            inputMode="decimal"
            onChange={onChange("acquisitionPrice")}
            placeholder="R$ 0,00"
            value={form.acquisitionPrice}
          />
        </InventoryField>
        <InventoryField label="Valor de venda anunciado *">
          <InventoryInput
            inputMode="decimal"
            onChange={onChange("price")}
            placeholder="R$ 0,00"
            value={form.price}
          />
        </InventoryField>
      </div>

      {showSuggestions && hasFipeReference ? (
        <div className="grid gap-4 rounded-xl border border-accent-soft/30 bg-accent-soft/40 p-4 sm:grid-cols-2">
          <SuggestionCard
            amountLabel={formatCentsCurrency(acquisitionCents)}
            buttonLabel="Aplicar -18% FIPE"
            onApply={() =>
              onChange("acquisitionPrice")(
                formatCentsForInput(acquisitionCents),
              )
            }
            title="Aquisição sugerida"
          />
          <SuggestionCard
            amountLabel={formatCentsCurrency(sellCents)}
            buttonLabel="Aplicar -3% FIPE"
            onApply={() => onChange("price")(formatCentsForInput(sellCents))}
            title="Venda sugerida"
          />
        </div>
      ) : null}
    </section>
  );
}

function SuggestionCard({
  amountLabel,
  buttonLabel,
  onApply,
  title,
}: {
  amountLabel: string;
  buttonLabel: string;
  onApply: () => void;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-panel p-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-black uppercase tracking-wider text-muted">
          {title}
        </span>
        <strong className="text-sm font-black text-app-text">
          {amountLabel}
        </strong>
      </div>
      <button
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-accent-soft/40 bg-accent px-3 text-xs font-black text-inverse transition-colors hover:bg-accent-strong"
        onClick={onApply}
        type="button"
      >
        <Calculator aria-hidden="true" className="size-4" />
        <span>{buttonLabel}</span>
      </button>
    </div>
  );
}
