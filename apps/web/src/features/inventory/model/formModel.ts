import type { ChangeEvent } from "react";
import type {
  InventoryDocumentKind,
  CreateInventoryFlowInput,
  InventoryCatalogSnapshot,
  InventoryListingStatus,
  InventoryMediaKind,
  InventoryUnit,
} from "./types";

export type InventoryFormState = {
  altText: string;
  catalog: InventoryCatalogSnapshot | null;
  description: string;
  manufactureYear: string;
  mediaKind: InventoryMediaKind;
  modelYear: string;
  plate: string;
  price: string;
  status: InventoryListingStatus;
  stockNumber: string;
  title: string;
  trimName: string;
  unitPlate: string;
  vin: string;
  storeId: string;
  modality: string;
  acquisitionPrice: string;
  vehicleType: string;
};

export type InventoryEditableField = Exclude<
  keyof InventoryFormState,
  "catalog"
>;

export type InventoryFieldChangeHandler = <
  Field extends InventoryEditableField,
>(
  field: Field,
) => (
  value:
    | ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    | InventoryFormState[Field],
) => void;

export const listingStatusOptions: Array<{
  label: string;
  value: InventoryListingStatus;
}> = [
  { label: "Rascunho", value: "draft" },
  { label: "Disponivel", value: "available" },
  { label: "Reservado", value: "reserved" },
  { label: "Vendido", value: "sold" },
  { label: "Inativo", value: "inactive" },
];

export const mediaKindOptions: Array<{
  label: string;
  value: InventoryMediaKind;
}> = [
  { label: "Foto", value: "photo" },
  { label: "Video", value: "video" },
  { label: "Documento", value: "document_preview" },
];

export const documentKindOptions: Array<{
  label: string;
  value: InventoryDocumentKind;
}> = [
  { label: "CRLV", value: "vehicle_registration" },
  { label: "Vistoria", value: "inspection" },
  { label: "Contrato", value: "sale_contract" },
  { label: "Comprador", value: "buyer_document" },
  { label: "Interno", value: "internal" },
  { label: "Outro", value: "other" },
];

export const unitStatusOptions: Array<{
  label: string;
  value: InventoryUnit["status"];
}> = [
  { label: "Disponivel", value: "available" },
  { label: "Reservada", value: "reserved" },
  { label: "Vendida", value: "sold" },
  { label: "Retirada", value: "retired" },
];

export function createInitialInventoryForm(): InventoryFormState {
  return {
    altText: "",
    catalog: null,
    description: "",
    manufactureYear: "",
    mediaKind: "photo",
    modelYear: "",
    plate: "",
    price: "",
    status: "draft",
    stockNumber: "",
    title: "",
    trimName: "",
    unitPlate: "",
    vin: "",
    storeId: "",
    modality: "Estoque próprio",
    acquisitionPrice: "",
    vehicleType: "Carro",
  };
}

export function createInventoryFlowInput(
  form: InventoryFormState,
  file: File | null,
): CreateInventoryFlowInput {
  return {
    listing: {
      description: nullableText(form.description),
      catalog: form.catalog,
      manufactureYear: nullableNumber(form.manufactureYear),
      modelYear: nullableNumber(form.modelYear),
      plate: nullablePlate(form.plate),
      priceCents: parsePriceCents(form.price),
      status: form.status,
      title: form.title.trim(),
      trimName: nullableText(form.trimName),
    },
    ...(file
      ? {
          media: {
            altText: nullableText(form.altText),
            displayOrder: 0,
            file,
            kind: form.mediaKind,
          },
        }
      : {}),
    unit: {
      plate: nullablePlate(form.unitPlate || form.plate),
      stockNumber: nullableText(form.stockNumber),
      vin: nullableText(form.vin),
    },
  };
}

export function validateInventoryForm(form: InventoryFormState): string | null {
  if (!form.title.trim()) return "Informe o titulo do anuncio.";

  if (form.price.trim() && parsePriceCents(form.price) === null) {
    return "Informe um preco de venda valido.";
  }

  if (
    form.acquisitionPrice.trim() &&
    parsePriceCents(form.acquisitionPrice) === null
  ) {
    return "Informe um valor de entrada valido.";
  }

  return null;
}

export function parsePriceCents(value: string): number | null {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");

  if (!normalized) return null;

  const price = Number(normalized);

  if (!Number.isFinite(price) || price < 0) return null;

  return Math.round(price * 100);
}

function nullablePlate(value: string): string | null {
  return nullableText(value)?.toUpperCase() ?? null;
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();

  return trimmed ? trimmed : null;
}

function nullableNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const number = Number(trimmed);
  return Number.isInteger(number) ? number : null;
}
