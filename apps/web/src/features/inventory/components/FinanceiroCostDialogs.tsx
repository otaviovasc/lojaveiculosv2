import { useEffect, useState } from "react";
import { AlertTriangle, Pencil, Plus, RotateCcw, Upload } from "lucide-react";
import { DatePickerField } from "../../../components/ui/DatePickerField";
import { formatCurrencyValue, parseCurrencyInput } from "../../../lib/masks";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import {
  InventoryField,
  InventoryInput,
  InventorySelect,
  InventoryTextarea,
} from "./InventoryFormParts";
import {
  costKindLabel,
  costKindOptions,
  type CostItem,
} from "./FinanceiroCustosSectionModel";
import type { InventoryCostKind } from "../model/types";

export function FinanceiroCostFormDialog({
  cost,
  isSaving,
  onOpenChange,
  onSave,
  open,
  status,
}: {
  cost: CostItem | null;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: {
    account: string;
    costDate: string;
    file: File | null;
    kind: InventoryCostKind;
    value: number;
  }) => Promise<boolean>;
  open: boolean;
  status?: string | null | undefined;
}) {
  const [account, setAccount] = useState("");
  const [costDate, setCostDate] = useState(today());
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<InventoryCostKind>("preparation");
  const [value, setValue] = useState("");
  const parsedCostDate = parseDateInput(costDate);

  useEffect(() => {
    if (!open) return;
    setAccount(cost?.account ?? "");
    setCostDate(cost?.dateIso ?? today());
    setFile(null);
    setKind(cost?.kind ?? "preparation");
    setValue(cost ? String(cost.value / 100) : "");
  }, [cost, open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const amountCents = Math.round(Number(value) * 100);
    if (!account.trim() || !parsedCostDate || amountCents <= 0) return;
    if (
      await onSave({
        account: account.trim(),
        costDate,
        file,
        kind,
        value: amountCents,
      })
    ) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md vehicle-dialog-surface"
        radius="xl"
        surface="panel"
      >
        <DialogHeader className="mb-4">
          <DialogTitle className="text-base font-black uppercase tracking-wider">
            {cost ? "Corrigir custo" : "Adicionar novo custo"}
          </DialogTitle>
          <DialogDescription className="text-xs font-bold text-muted">
            {cost
              ? "A correção atualiza o lançamento financeiro e fica registrada na auditoria."
              : "Registre uma despesa associada a este veículo."}
          </DialogDescription>
        </DialogHeader>

        {status ? (
          <div
            aria-live="polite"
            className="mb-4 rounded-lg border border-danger/30 bg-danger/10 p-2.5 text-xs font-bold text-danger"
          >
            {status}
          </div>
        ) : null}

        <form
          className="grid gap-4"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <InventoryField label="Conta / Descrição" required>
            <InventoryInput
              disabled={isSaving}
              onChange={(event) => setAccount(event.target.value)}
              placeholder="Ex: Pintura do parachoque"
              required
              value={account}
            />
          </InventoryField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InventoryField label="Valor (R$)" required>
              <InventoryInput
                disabled={isSaving}
                inputMode="decimal"
                onChange={(event) =>
                  setValue(parseCurrencyInput(event.target.value))
                }
                placeholder="0,00"
                required
                value={formatCurrencyValue(value)}
              />
            </InventoryField>
            <InventoryField label="Data do custo" required>
              <DatePickerField
                ariaDescribedBy={
                  parsedCostDate ? undefined : "vehicle-cost-date-error"
                }
                invalid={!parsedCostDate}
                isDisabled={isSaving}
                isRequired
                label="Data do custo"
                onChange={(date) => setCostDate(formatDateInput(date))}
                value={parsedCostDate}
              />
              {!parsedCostDate ? (
                <span
                  className="text-xs font-bold text-danger"
                  id="vehicle-cost-date-error"
                  role="alert"
                >
                  Selecione uma data válida.
                </span>
              ) : null}
            </InventoryField>
          </div>

          <InventoryField label="Tipo do custo" required>
            <InventorySelect
              ariaLabel="Tipo do custo"
              disabled={isSaving}
              onChange={(next) => {
                if (costKindOptions.includes(next as InventoryCostKind)) {
                  setKind(next as InventoryCostKind);
                }
              }}
              options={costKindOptions.map((option) => ({
                label: costKindLabel(option),
                value: option,
              }))}
              value={kind}
            />
          </InventoryField>

          {!cost ? (
            <InventoryField label="Comprovante / Nota (Opcional)">
              <div className="mt-1 flex items-center gap-2">
                <label className="flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-line bg-app px-3.5 text-xs font-black text-app-text transition-all hover:bg-line/25">
                  <Upload aria-hidden="true" className="size-3.5 text-muted" />
                  <span>{file ? "Alterar arquivo" : "Escolher arquivo"}</span>
                  <input
                    accept="image/*,application/pdf,.doc,.docx"
                    className="sr-only"
                    disabled={isSaving}
                    onChange={(event) =>
                      setFile(event.target.files?.[0] ?? null)
                    }
                    type="file"
                  />
                </label>
                <span className="max-w-[200px] truncate text-xs font-bold text-muted">
                  {file?.name ?? "Nenhum arquivo selecionado"}
                </span>
              </div>
            </InventoryField>
          ) : null}

          <DialogFooter
            className="flex justify-end gap-2"
            divider
            paddingTop="md"
          >
            <button
              className="min-h-9 cursor-pointer rounded-lg border border-line px-4 text-xs font-black text-app-text transition-all hover:bg-line/25"
              disabled={isSaving}
              onClick={() => onOpenChange(false)}
              type="button"
            >
              Voltar
            </button>
            <button
              className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-4 text-xs font-black text-accent-foreground transition-all hover:bg-accent-strong hover:text-accent-strong-foreground disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSaving}
              type="submit"
            >
              {cost ? (
                <Pencil aria-hidden="true" className="size-3.5" />
              ) : (
                <Plus aria-hidden="true" className="size-3.5" />
              )}
              <span>
                {isSaving
                  ? "Salvando..."
                  : cost
                    ? "Salvar correção"
                    : "Confirmar"}
              </span>
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function FinanceiroCostVoidDialog({
  cost,
  isSaving,
  onOpenChange,
  onVoid,
  open,
  status,
}: {
  cost: CostItem | null;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onVoid: (reason: string) => Promise<boolean>;
  open: boolean;
  status?: string | null | undefined;
}) {
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md vehicle-dialog-surface"
        radius="xl"
        surface="panel"
      >
        <DialogHeader className="mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-danger/30 bg-danger/10 text-danger">
              <AlertTriangle aria-hidden="true" className="size-4.5" />
            </div>
            <div>
              <DialogTitle className="text-base font-black uppercase tracking-wider text-app-text">
                Estornar custo
              </DialogTitle>
              <DialogDescription className="text-xs font-bold text-muted">
                {cost
                  ? `${cost.account} (${cost.kindLabel}) continuará no histórico como estornado.`
                  : "O custo continuará visível no histórico."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {status ? (
          <p
            aria-live="polite"
            className="mb-4 rounded-lg border border-danger/30 bg-danger/10 p-2.5 text-xs font-bold text-danger"
          >
            {status}
          </p>
        ) : null}
        <InventoryField label="Motivo do estorno" required>
          <InventoryTextarea
            disabled={isSaving}
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Explique por que este lançamento deve ser cancelado."
            required
            value={reason}
          />
        </InventoryField>
        <DialogFooter
          className="flex justify-end gap-2"
          divider
          paddingTop="md"
        >
          <button
            className="min-h-9 cursor-pointer rounded-lg border border-line px-4 text-xs font-black text-app-text transition-all hover:bg-line/25 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            onClick={() => onOpenChange(false)}
            type="button"
          >
            Voltar
          </button>
          <button
            className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-danger px-4 text-xs font-black text-white transition-all hover:bg-danger/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving || reason.trim().length < 3}
            onClick={() =>
              void onVoid(reason.trim()).then((ok) => ok && onOpenChange(false))
            }
            type="button"
          >
            <RotateCcw aria-hidden="true" className="size-3.5" />
            <span>{isSaving ? "Estornando..." : "Confirmar estorno"}</span>
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function today() {
  return formatDateInput(new Date());
}

function parseDateInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.getFullYear() === Number(year) &&
    date.getMonth() === Number(month) - 1 &&
    date.getDate() === Number(day)
    ? date
    : null;
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
