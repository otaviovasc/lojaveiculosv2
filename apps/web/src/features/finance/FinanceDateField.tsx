import { X } from "lucide-react";
import { DatePickerField } from "../../components/ui/DatePickerField";

export function FinanceDateField({
  disabled,
  label,
  onChange,
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="grid gap-2 text-sm font-black text-app-text">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <DatePickerField
          isDisabled={disabled}
          label="Data"
          onChange={(date) => onChange(toInputDate(date))}
          value={fromInputDate(value)}
        />
        {value ? (
          <button
            aria-label={`Limpar ${label}`}
            className="flex size-10 items-center justify-center rounded-lg border border-line bg-app text-muted disabled:cursor-not-allowed disabled:opacity-50"
            disabled={disabled}
            onClick={() => onChange("")}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function fromInputDate(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toInputDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
