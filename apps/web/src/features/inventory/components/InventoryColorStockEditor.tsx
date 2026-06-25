import { Minus, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import type { InventoryColorStockDraft } from "../model/formModel";
import { InventoryColorSelect, InventoryInput } from "./InventoryFormParts";

type InventoryColorStockEditorProps = {
  onChange: (rows: InventoryColorStockDraft[]) => void;
  value: readonly InventoryColorStockDraft[];
};

export function InventoryColorStockEditor({
  onChange,
  value,
}: InventoryColorStockEditorProps) {
  const rows = value.length > 0 ? value : [createEmptyRow()];
  const total = rows.reduce((sum, row) => sum + quantityValue(row.quantity), 0);

  return (
    <div className="grid gap-3 rounded-lg border border-line bg-app p-3">
      <div className="grid gap-2">
        {rows.map((row, index) => (
          <div
            className="grid gap-2 rounded-lg border border-line bg-panel p-2 sm:grid-cols-[minmax(0,1fr)_8rem_auto]"
            key={index}
          >
            <InventoryColorSelect
              onChange={(colorName) =>
                onChange(updateRow(rows, index, { colorName }))
              }
              value={row.colorName}
            />
            <InventoryInput
              inputMode="numeric"
              min={0}
              onChange={(event) =>
                onChange(
                  updateRow(rows, index, { quantity: event.target.value }),
                )
              }
              type="number"
              value={row.quantity}
            />
            <div className="flex items-center gap-1">
              <IconButton
                label="Diminuir quantidade"
                onClick={() => onChange(incrementQuantity(rows, index, -1))}
              >
                <Minus aria-hidden="true" className="size-4" />
              </IconButton>
              <IconButton
                label="Aumentar quantidade"
                onClick={() => onChange(incrementQuantity(rows, index, 1))}
              >
                <Plus aria-hidden="true" className="size-4" />
              </IconButton>
              <IconButton
                disabled={rows.length <= 1}
                label="Remover cor"
                onClick={() => onChange(rows.filter((_, i) => i !== index))}
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </IconButton>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line bg-panel px-3 text-xs font-black text-app-text transition-colors hover:bg-app-elevated"
          onClick={() => onChange([...rows, createEmptyRow()])}
          type="button"
        >
          <Plus aria-hidden="true" className="size-4" />
          <span>Adicionar cor</span>
        </button>
        <span className="text-xs font-black uppercase tracking-wider text-muted">
          Total: {total} unidades
        </span>
      </div>
    </div>
  );
}

function IconButton({
  children,
  disabled = false,
  label,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="flex size-10 items-center justify-center rounded-lg border border-line bg-app text-app-text transition-colors hover:bg-app-elevated disabled:cursor-not-allowed disabled:opacity-40"
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function createEmptyRow(): InventoryColorStockDraft {
  return { colorName: "", quantity: "1" };
}

function updateRow(
  rows: readonly InventoryColorStockDraft[],
  index: number,
  patch: Partial<InventoryColorStockDraft>,
) {
  return rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
}

function incrementQuantity(
  rows: readonly InventoryColorStockDraft[],
  index: number,
  delta: number,
) {
  return updateRow(rows, index, {
    quantity: String(
      Math.max(0, quantityValue(rows[index]?.quantity ?? "") + delta),
    ),
  });
}

function quantityValue(value: string) {
  const quantity = Number(value);
  return Number.isInteger(quantity) && quantity > 0 ? quantity : 0;
}
