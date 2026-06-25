import {
  createInitialInventoryForm,
  type InventoryFormState,
} from "./formModel";

const draftStorageKey = "lojaveiculosv2:inventory:create:draft";

export type InventoryCreateDraft = {
  form: InventoryFormState;
  mediaFileNames: readonly string[];
  updatedAt: string;
};

export function loadInventoryCreateDraft(
  storage: Storage | undefined = safeStorage(),
): InventoryCreateDraft | null {
  if (!storage) return null;

  try {
    const raw = storage.getItem(draftStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<InventoryCreateDraft>;
    if (!parsed.form || !parsed.updatedAt) return null;
    const initialForm = createInitialInventoryForm();
    return {
      form: {
        ...initialForm,
        ...parsed.form,
        colorStock: Array.isArray(parsed.form.colorStock)
          ? parsed.form.colorStock
          : initialForm.colorStock,
      },
      mediaFileNames: Array.isArray(parsed.mediaFileNames)
        ? parsed.mediaFileNames.filter(
            (item): item is string => typeof item === "string",
          )
        : [],
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

export function saveInventoryCreateDraft(
  input: Omit<InventoryCreateDraft, "updatedAt">,
  storage: Storage | undefined = safeStorage(),
) {
  if (!storage || !hasDraftContent(input.form, input.mediaFileNames)) return;
  storage.setItem(
    draftStorageKey,
    JSON.stringify({ ...input, updatedAt: new Date().toISOString() }),
  );
}

export function clearInventoryCreateDraft(
  storage: Storage | undefined = safeStorage(),
) {
  storage?.removeItem(draftStorageKey);
}

export function hasDraftContent(
  form: InventoryFormState,
  mediaFileNames: readonly string[] = [],
) {
  return (
    mediaFileNames.length > 0 ||
    Boolean(
      form.title.trim() ||
      form.plate.trim() ||
      form.vin.trim() ||
      form.stockNumber.trim() ||
      form.colorName ||
      form.colorStock.some(hasColorStockDraftContent) ||
      form.description.trim() ||
      form.price.trim() ||
      form.acquisitionPrice.trim() ||
      form.catalog,
    )
  );
}

function hasColorStockDraftContent(
  row: InventoryFormState["colorStock"][number],
) {
  const quantity = row.quantity.trim();
  return Boolean(row.colorName || (quantity && quantity !== "1"));
}

function safeStorage() {
  if (typeof window === "undefined") return undefined;
  return window.localStorage;
}
