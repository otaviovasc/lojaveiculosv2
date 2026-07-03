import { Check, Palette } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { FeatureInput } from "./FeatureControls";
import { cx } from "./featureShared";

type FeatureColorPickerProps = {
  allowEmpty?: boolean;
  className?: string;
  disabled?: boolean;
  fallbackColor?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  presets?: readonly string[];
  value: string;
};

const hash = String.fromCharCode(35);

export function FeatureColorPicker({
  allowEmpty,
  className,
  disabled,
  fallbackColor,
  label,
  onChange,
  placeholder,
  presets = [],
  value,
}: FeatureColorPickerProps) {
  const inputId = useId();
  const nativeInputRef = useRef<HTMLInputElement | null>(null);
  const normalizedValue = normalizeHexColor(value);
  const normalizedFallback = normalizeHexColor(fallbackColor);
  const pickerValue = normalizedValue ?? normalizedFallback ?? defaultColor();
  const [draftValue, setDraftValue] = useState(value);
  const isInvalid =
    Boolean(draftValue.trim()) && !normalizeHexColor(draftValue);

  useEffect(() => {
    setDraftValue(normalizedValue ?? value);
  }, [normalizedValue, value]);

  const commitValue = (nextValue: string) => {
    const normalized = normalizeHexColor(nextValue);
    setDraftValue(nextValue);
    if (normalized) {
      onChange(normalized);
      return;
    }
    if (allowEmpty && nextValue.trim() === "") onChange("");
  };

  return (
    <div className={cx("grid gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <label
          className="text-xs font-black uppercase tracking-widest text-muted"
          htmlFor={inputId}
        >
          {label}
        </label>
        <span className="font-mono text-xs font-bold uppercase text-muted">
          {normalizedValue ?? (allowEmpty ? "Tema" : pickerValue)}
        </span>
      </div>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
        <button
          aria-label={`Selecionar ${label}`}
          className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-app shadow-sm outline-none transition-colors hover:border-accent focus:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          onClick={() => nativeInputRef.current?.click()}
          type="button"
        >
          <span
            aria-hidden="true"
            className="absolute inset-1 rounded-md"
            style={{ backgroundColor: pickerValue }}
          />
          <Palette
            aria-hidden="true"
            className="relative size-4 text-inverse drop-shadow"
          />
        </button>
        <FeatureInput
          aria-invalid={isInvalid}
          className="font-mono uppercase"
          disabled={disabled}
          id={inputId}
          onBlur={() => {
            if (!isInvalid) return;
            setDraftValue(normalizedValue ?? "");
          }}
          onChange={(event) => commitValue(event.target.value)}
          placeholder={placeholder ?? pickerValue}
          value={draftValue}
        />
        <input
          aria-hidden="true"
          className="sr-only"
          disabled={disabled}
          onChange={(event) => commitValue(event.target.value)}
          ref={nativeInputRef}
          tabIndex={-1}
          type="color"
          value={pickerValue}
        />
      </div>
      {presets.length ? (
        <div
          aria-label={`Cores sugeridas para ${label}`}
          className="flex flex-wrap gap-1.5"
          role="group"
        >
          {presets.map((preset) => {
            const normalizedPreset = normalizeHexColor(preset);
            if (!normalizedPreset) return null;
            const selected =
              normalizedValue?.toLowerCase() === normalizedPreset.toLowerCase();
            return (
              <button
                aria-label={`${label} ${normalizedPreset}`}
                aria-pressed={selected}
                className={cx(
                  "grid size-7 place-items-center rounded-full border transition-transform hover:scale-105 focus:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:opacity-50",
                  selected
                    ? "border-accent ring-2 ring-accent/20"
                    : "border-line",
                )}
                disabled={disabled}
                key={normalizedPreset}
                onClick={() => commitValue(normalizedPreset)}
                style={{ backgroundColor: normalizedPreset }}
                type="button"
              >
                {selected ? (
                  <Check aria-hidden="true" className="size-3.5 text-inverse" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
      {isInvalid ? (
        <p className="text-xs font-black text-danger">Use HEX válido.</p>
      ) : null}
    </div>
  );
}

export function normalizeHexColor(value: string | null | undefined) {
  const clean = value?.trim().replace(/^#/, "") ?? "";
  if (/^[0-9a-f]{3}$/i.test(clean)) {
    return `${hash}${clean
      .split("")
      .map((part) => part + part)
      .join("")
      .toUpperCase()}`;
  }
  if (/^[0-9a-f]{6}$/i.test(clean)) return `${hash}${clean.toUpperCase()}`;
  return null;
}

function defaultColor() {
  return `${hash}${"0".repeat(6)}`;
}
