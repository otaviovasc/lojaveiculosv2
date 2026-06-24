import { useEffect, useMemo, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  placeholder,
  className,
}: {
  combobox?: boolean;
  disabled?: boolean;
  kind?: "brand" | "default";
  label: string;
  onChange: (value: string) => void;
  options: readonly InventoryCatalogOption[];
  value: string;
  placeholder?: string | undefined;
  className?: string | undefined;
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
        placeholder={placeholder}
        className={className}
      />
    );
  }

  return (
    <InventoryField label={label} className={className}>
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
  placeholder,
  className,
}: {
  disabled: boolean;
  kind: "brand" | "default";
  label: string;
  onChange: (value: string) => void;
  options: readonly InventoryCatalogOption[];
  value: string;
  placeholder?: string | undefined;
  className?: string | undefined;
}) {
  const rootRef = useRef<HTMLLabelElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
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

  const [menuPosition, setMenuPosition] = useState({
    left: 0,
    maxHeight: 288,
    maxWidth: 320,
    minWidth: 0,
    top: 0,
    width: 0,
  });

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const gap = 6;
      const edgePadding = 12;
      const preferredHeight = 288;
      const maxWidth = Math.max(96, window.innerWidth - edgePadding * 2);
      const minWidth = Math.min(rect.width, maxWidth);
      const naturalWidth = menuRef.current?.scrollWidth ?? rect.width;
      const menuWidth = Math.min(Math.max(naturalWidth, minWidth), maxWidth);
      const viewportRight = window.innerWidth - edgePadding;
      const clampedLeft = Math.max(
        edgePadding,
        Math.min(rect.left, viewportRight - menuWidth),
      );
      const belowSpace = window.innerHeight - rect.bottom - edgePadding;
      const aboveSpace = rect.top - edgePadding;
      const openAbove = belowSpace < 160 && aboveSpace > belowSpace;
      const maxHeight = Math.max(
        96,
        Math.min(
          preferredHeight,
          openAbove ? aboveSpace - gap : belowSpace - gap,
        ),
      );

      setMenuPosition({
        left: clampedLeft,
        maxHeight,
        maxWidth,
        minWidth,
        top: openAbove ? rect.top - gap - maxHeight : rect.bottom + gap,
        width: menuWidth,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    setQuery(selectedName ?? "");
  }, [selectedName]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <InventoryField label={label} ref={rootRef} className={className}>
      <div className="relative w-full" ref={triggerRef}>
        <InventoryInput
          aria-autocomplete="list"
          aria-expanded={open}
          autoComplete="off"
          className="w-full"
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
          placeholder={placeholder ?? "Digite para buscar..."}
          role="combobox"
          value={query}
        />
        {open && filtered.length > 0
          ? createPortal(
              <div
                className="custom-select-menu"
                role="listbox"
                style={{
                  left: menuPosition.left,
                  maxHeight: menuPosition.maxHeight,
                  maxWidth: menuPosition.maxWidth,
                  minWidth: menuPosition.minWidth,
                  top: menuPosition.top,
                  width: menuPosition.width || "max-content",
                }}
                ref={menuRef}
              >
                {filtered.map((option) => {
                  const isSelected = option.code === value;
                  return (
                    <button
                      aria-selected={isSelected}
                      className="custom-select-option"
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
                        <span className="truncate">{option.name}</span>
                      )}
                    </button>
                  );
                })}
              </div>,
              document.body,
            )
          : null}
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
      <span className="min-w-0 truncate">{option.name}</span>
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
