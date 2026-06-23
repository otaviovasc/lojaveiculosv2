import { InventoryField, InventorySelect } from "./InventoryFormParts";
import type {
  InventoryCatalogOption,
  InventoryCatalogSnapshot,
} from "../model/types";

export type CatalogState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string };

export function CatalogSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: readonly InventoryCatalogOption[];
  value: string;
}) {
  return (
    <InventoryField label={label}>
      <InventorySelect
        value={value}
        onChange={onChange}
        options={[
          { label: "Selecionar", value: "" },
          ...options.map((option) => ({
            label: option.name,
            value: option.code,
          })),
        ]}
      />
    </InventoryField>
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
