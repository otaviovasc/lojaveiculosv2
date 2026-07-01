import { BadgeDollarSign, LoaderCircle } from "lucide-react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { parsePriceCents } from "../model/formModel";
import { InventoryBadge } from "./InventoryFormParts";
import type { InventoryUnit } from "../model/types";

export type WorkflowMode = "reserve" | "sell";
export type WorkflowState =
  | { kind: "error"; message: string }
  | { kind: "idle" | "saving" | "saved"; mode?: WorkflowMode | "release" };

export function ModeButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  const className = active
    ? "min-h-10 rounded-lg bg-accent px-4 text-sm font-black text-inverse"
    : "min-h-10 rounded-lg bg-app px-4 text-sm font-black text-app-text";

  return (
    <button
      aria-pressed={active}
      className={className}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function WorkflowModePicker({
  mode,
  primaryUnit,
  setMode,
}: {
  mode: WorkflowMode;
  primaryUnit: InventoryUnit | null;
  setMode: Dispatch<SetStateAction<WorkflowMode>>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ModeButton
        active={mode === "reserve"}
        onClick={() => setMode("reserve")}
      >
        Reservar
      </ModeButton>
      <ModeButton active={mode === "sell"} onClick={() => setMode("sell")}>
        Vender
      </ModeButton>
      {primaryUnit ? (
        <InventoryBadge tone="blue">
          {primaryUnitLabel(primaryUnit)}
        </InventoryBadge>
      ) : null}
    </div>
  );
}

function primaryUnitLabel(unit: InventoryUnit) {
  const label = [unit.stockNumber, unit.plate].filter(Boolean).join(" / ");
  return label ? `Unidade principal ${label}` : "Unidade principal selecionada";
}

export function WorkflowSubmitButton({
  isDisabled,
  isSaving,
  mode,
}: {
  isDisabled: boolean;
  isSaving: boolean;
  mode: WorkflowMode;
}) {
  return (
    <button
      className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-transparent bg-accent px-4 text-sm font-black text-inverse disabled:cursor-not-allowed disabled:border-line disabled:bg-app-elevated disabled:text-muted disabled:opacity-100"
      disabled={isDisabled}
      type="submit"
    >
      {isSaving ? (
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
      ) : (
        <BadgeDollarSign aria-hidden="true" className="size-4" />
      )}
      {mode === "reserve"
        ? "Registrar reserva da loja"
        : "Registrar venda da loja"}
    </button>
  );
}

export function WorkflowStatus({ state }: { state: WorkflowState }) {
  if (state.kind === "error") {
    return <p className="text-sm font-black text-danger">{state.message}</p>;
  }

  if (state.kind === "saved") {
    return (
      <p className="text-sm font-black text-accent-strong">
        {state.mode === "release"
          ? "Reserva liberada pela loja."
          : state.mode === "reserve"
            ? "Reserva registrada pela loja."
            : "Venda registrada pela loja."}
      </p>
    );
  }

  if (state.kind === "saving") {
    return (
      <p className="text-sm font-black text-muted">
        {state.mode === "release"
          ? "Liberando reserva."
          : state.mode === "reserve"
            ? "Registrando reserva."
            : "Registrando venda."}
      </p>
    );
  }

  return (
    <p className="text-sm font-bold text-muted">
      Fluxo executado por usuario da loja.
    </p>
  );
}

export function parseRequiredMoney(value: string): number | null {
  const cents = parsePriceCents(value);
  return cents && cents > 0 ? cents : null;
}

export function parseOptionalMoney(value: string): number | null | undefined {
  if (!value.trim()) return undefined;
  return parseRequiredMoney(value);
}

export function formatMoneyInput(value: number | null): string {
  return value === null
    ? ""
    : String((value / 100).toFixed(2)).replace(".", ",");
}
