import type { ReactNode } from "react";
import {
  FeatureInput,
  FeatureSelect,
  FeatureTextarea,
} from "../../components/ui/FeatureControls";
import { StorefrontImagePicker } from "./StorefrontImagePicker";

export type BuilderRecord = Record<string, unknown>;

export function BuilderField({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-black uppercase tracking-widest text-muted">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function BuilderTextInput({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: unknown;
}) {
  return (
    <BuilderField label={label}>
      <FeatureInput
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={textValue(value)}
      />
    </BuilderField>
  );
}

export function BuilderTextareaInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: unknown;
}) {
  return (
    <BuilderField label={label}>
      <FeatureTextarea
        onChange={(event) => onChange(event.target.value)}
        value={textValue(value)}
      />
    </BuilderField>
  );
}

export function BuilderImageInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: unknown;
}) {
  return (
    <StorefrontImagePicker
      imageClassName="h-28 w-full rounded-lg"
      label={label}
      onChange={(nextValue) => onChange(nextValue ?? "")}
      value={textValue(value)}
    />
  );
}

export function BuilderNumberInput({
  label,
  max,
  min = 0,
  onChange,
  value,
}: {
  label: string;
  max?: number;
  min?: number;
  onChange: (value: number) => void;
  value: unknown;
}) {
  return (
    <BuilderField label={label}>
      <FeatureInput
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        type="number"
        value={numberValue(value, min)}
      />
    </BuilderField>
  );
}

export function BuilderColorInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: unknown;
}) {
  return (
    <BuilderField label={label}>
      <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-2">
        <FeatureInput
          className="min-h-10 w-14 shrink-0 px-1"
          onChange={(event) => onChange(event.target.value)}
          type="color"
          value={colorValue(value)}
        />
        <FeatureInput
          onChange={(event) => onChange(event.target.value)}
          value={textValue(value)}
        />
      </div>
    </BuilderField>
  );
}

export function BuilderSelectInput<Value extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: Value) => void;
  options: ReadonlyArray<{ label: string; value: Value }>;
  value: unknown;
}) {
  return (
    <BuilderField label={label}>
      <FeatureSelect
        onChange={onChange}
        options={options}
        value={textValue(value) as Value}
      />
    </BuilderField>
  );
}

export function BuilderToggleInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: boolean) => void;
  value: unknown;
}) {
  return (
    <label className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-lg border border-line bg-app p-3 text-sm font-black leading-snug">
      <input
        className="size-4 accent-[var(--color-accent)]"
        checked={value !== false}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span className="min-w-0">{label}</span>
    </label>
  );
}

export function recordArray(value: unknown): BuilderRecord[] {
  return Array.isArray(value)
    ? value.filter(isRecord).map((item) => ({ ...item }))
    : [];
}

export function recordValue(value: unknown): BuilderRecord {
  return isRecord(value) ? { ...value } : {};
}

export function textArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => textValue(item)) : [];
}

export function textValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isRecord(value: unknown): value is BuilderRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function colorValue(value: unknown) {
  if (typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value.trim())) {
    return value.trim();
  }
  return ["#", "000000"].join("");
}
