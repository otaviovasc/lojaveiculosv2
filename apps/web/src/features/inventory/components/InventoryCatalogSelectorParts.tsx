import { useEffect, useMemo, useRef, useState } from "react";
import {
  InventoryField,
  InventoryInput,
  InventorySelect,
} from "./InventoryFormParts";
import type {
  InventoryCatalogOption,
  InventoryCatalogSnapshot,
} from "../model/types";

export type CatalogState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string };

export function CatalogSelect({
  combobox = false,
  disabled = false,
  kind = "default",
  label,
  onChange,
  options,
  value,
}: {
  combobox?: boolean;
  disabled?: boolean;
  kind?: "brand" | "default";
  label: string;
  onChange: (value: string) => void;
  options: readonly InventoryCatalogOption[];
  value: string;
}) {
  if (combobox) {
    return (
      <CatalogCombobox
        disabled={disabled}
        kind={kind}
        label={label}
        onChange={onChange}
        options={options}
        value={value}
      />
    );
  }

  return (
    <InventoryField label={label}>
      <InventorySelect
        disabled={disabled}
        value={value}
        onChange={onChange}
        options={[
          { label: "Selecionar", value: "" },
          ...options.map((option) => ({
            label:
              kind === "brand" ? (
                <BrandOptionLabel option={option} />
              ) : (
                option.name
              ),
            value: option.code,
          })),
        ]}
      />
    </InventoryField>
  );
}

function CatalogCombobox({
  disabled,
  kind,
  label,
  onChange,
  options,
  value,
}: {
  disabled: boolean;
  kind: "brand" | "default";
  label: string;
  onChange: (value: string) => void;
  options: readonly InventoryCatalogOption[];
  value: string;
}) {
  const rootRef = useRef<HTMLLabelElement>(null);
  const selected = options.find((option) => option.code === value);
  const [query, setQuery] = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);
  const selectedName = selected?.name;
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search || selectedName === query) return options.slice(0, 40);
    return options
      .filter((option) => option.name.toLowerCase().includes(search))
      .slice(0, 40);
  }, [options, query, selectedName]);

  useEffect(() => {
    setQuery(selectedName ?? "");
  }, [selectedName]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <InventoryField label={label} ref={rootRef}>
      <div className="relative">
        <InventoryInput
          aria-autocomplete="list"
          aria-expanded={open}
          autoComplete="off"
          disabled={disabled}
          onBlur={() => {
            if (selected && query !== selected.name) setQuery(selected.name);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          placeholder="Digite para buscar..."
          role="combobox"
          value={query}
        />
        {open && filtered.length > 0 ? (
          <div
            className="absolute left-0 right-0 top-full z-20 mt-2 max-h-72 overflow-y-auto rounded-lg border border-line bg-panel p-1.5 shadow-[var(--shadow-panel)]"
            role="listbox"
          >
            {filtered.map((option) => {
              const isSelected = option.code === value;
              return (
                <button
                  aria-selected={isSelected}
                  className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-bold text-app-text transition-colors hover:bg-app-elevated data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent-strong"
                  data-selected={isSelected ? "true" : undefined}
                  key={option.code}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(option.code);
                    setQuery(option.name);
                    setOpen(false);
                  }}
                  role="option"
                  type="button"
                >
                  {kind === "brand" ? (
                    <BrandOptionLabel option={option} />
                  ) : (
                    <span className="break-words">{option.name}</span>
                  )}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </InventoryField>
  );
}

function BrandOptionLabel({ option }: { option: InventoryCatalogOption }) {
  const initials = option.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-md border border-line bg-app-elevated text-[10px] font-black text-muted">
        {option.imageUrl ? (
          <img
            alt=""
            className="size-full object-contain"
            src={option.imageUrl}
          />
        ) : (
          initials || "?"
        )}
      </span>
      <span className="min-w-0 break-words">{option.name}</span>
    </span>
  );
}

export function CatalogStatus({
  catalog,
  state,
}: {
  catalog: InventoryCatalogSnapshot | null;
  state: CatalogState;
}) {
  const text =
    state.kind === "loading"
      ? "Carregando catalogo."
      : state.kind === "error"
        ? state.message
        : catalog?.fipeCode
          ? `FIPE ${catalog.fipeCode} - ${catalog.referenceMonth ?? ""}`
          : "FIPE pendente.";
  const tone = state.kind === "error" ? "text-danger" : "text-muted";
  return <p className={`lg:col-span-5 text-sm font-black ${tone}`}>{text}</p>;
}

export function resetCatalog(
  setBrandCode: (value: string) => void,
  setModelFamilyCode: (value: string) => void,
  setVersionCode: (value: string) => void,
  setYearCode: (value: string) => void,
  onCatalogChange: (catalog: InventoryCatalogSnapshot | null) => void,
) {
  setBrandCode("");
  setModelFamilyCode("");
  setVersionCode("");
  setYearCode("");
  onCatalogChange(null);
}

export function toErrorState(error: unknown): CatalogState {
  return {
    kind: "error",
    message: error instanceof Error ? error.message : String(error),
  };
}
