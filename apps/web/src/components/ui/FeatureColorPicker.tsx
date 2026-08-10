import { Check, Copy, Palette, Pipette } from "lucide-react";
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

type EyeDropperConstructor = new () => {
  open: () => Promise<{ sRGBHex?: string }>;
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
  const [copied, setCopied] = useState(false);
  const isInvalid =
    Boolean(draftValue.trim()) && !normalizeHexColor(draftValue);

  const EyeDropper =
    typeof window === "undefined"
      ? null
      : ((window as Window & { EyeDropper?: EyeDropperConstructor })
          .EyeDropper ?? null);
  const hasEyeDropper = Boolean(EyeDropper);

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

  const handleEyeDropper = async () => {
    if (!EyeDropper) return;
    try {
      const eyeDropper = new EyeDropper();
      const result = await eyeDropper.open();
      if (result?.sRGBHex) {
        commitValue(result.sRGBHex);
      }
    } catch {
      // User cancelled eye dropper selection
    }
  };

  const copyHex = async () => {
    const hexToCopy = normalizedValue ?? pickerValue;
    try {
      await navigator.clipboard?.writeText(hexToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard write failed
    }
  };

  return (
    <div className={cx("grid gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <label
          className="text-xs font-semibold uppercase tracking-widest text-muted"
          htmlFor={inputId}
        >
          {label}
        </label>
        <div className="flex items-center gap-1.5">
          <button
            aria-label="Copiar código HEX"
            className="flex items-center gap-1 font-mono text-xs font-semibold uppercase text-muted hover:text-foreground"
            onClick={() => void copyHex()}
            title="Clique para copiar código HEX"
            type="button"
          >
            {normalizedValue ?? (allowEmpty ? "Tema" : pickerValue)}
            {copied ? (
              <Check className="h-3 w-3 text-emerald-500" />
            ) : (
              <Copy className="h-3 w-3 opacity-60" />
            )}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
        <button
          aria-label={`Selecionar ${label}`}
          className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-app outline-none transition-transform hover:scale-105 focus:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          onClick={() => nativeInputRef.current?.click()}
          type="button"
        >
          <span
            aria-hidden="true"
            className="absolute inset-1 rounded-md shadow-inner"
            style={{ backgroundColor: pickerValue }}
          />
          <Palette
            aria-hidden="true"
            className="relative size-3.5 text-inverse drop-shadow-md"
          />
        </button>
        <FeatureInput
          aria-invalid={isInvalid}
          className="font-mono uppercase text-xs h-10"
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
        {hasEyeDropper ? (
          <button
            aria-label="Capturar cor da tela"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-card/50 text-muted transition-colors hover:border-accent hover:text-foreground"
            disabled={disabled}
            onClick={() => void handleEyeDropper()}
            title="Conta-gotas: capturar cor de qualquer elemento na tela"
            type="button"
          >
            <Pipette className="h-4 w-4" />
          </button>
        ) : null}
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
          className="flex flex-wrap gap-1.5 pt-0.5"
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
                  "grid size-6 place-items-center rounded-full border transition-transform hover:scale-110 focus:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:opacity-50",
                  selected
                    ? "border-accent ring-2 ring-accent/30 scale-105"
                    : "border-line/70",
                )}
                disabled={disabled}
                key={normalizedPreset}
                onClick={() => commitValue(normalizedPreset)}
                style={{ backgroundColor: normalizedPreset }}
                type="button"
              >
                {selected ? (
                  <Check aria-hidden="true" className="size-3 text-inverse" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
      {isInvalid ? (
        <p className="text-xs font-semibold text-danger">
          Use um HEX válido (ex: RRGGBB).
        </p>
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
