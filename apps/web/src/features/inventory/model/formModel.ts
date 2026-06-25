import type { ChangeEvent } from "react";
import {
  coerceVehicleColor,
  normalizeVehicleColor,
  vehicleEngineAspirationOptions,
  vehicleEngineDisplacementOptions,
  type VehicleColor,
} from "@lojaveiculosv2/shared";
import type {
  InventoryDocumentKind,
  CreateInventoryFlowInput,
  CreateInventoryUnitInput,
  InventoryCatalogSnapshot,
  InventoryCreateListingStatus,
  InventoryEngineAspiration,
  InventoryEngineDisplacement,
  InventoryFuelType,
  InventoryListingStatus,
  InventoryMediaKind,
  InventoryTransmission,
  InventoryUnit,
} from "./types";
import { nullableRichTextDescription } from "./richTextDescription";

export type InventoryColorStockDraft = {
  colorName: VehicleColor | "";
  quantity: string;
};

export type InventoryFormState = {
  altText: string;
  catalog: InventoryCatalogSnapshot | null;
  colorName: VehicleColor | "";
  colorStock: InventoryColorStockDraft[];
  description: string;
  doors: string;
  engineAspiration: InventoryEngineAspiration | "";
  engineDisplacement: InventoryEngineDisplacement | "";
  fuelType: InventoryFuelType | "";
  internalNotes: string;
  manufactureYear: string;
  mediaKind: InventoryMediaKind;
  mileageKm: string;
  modelYear: string;
  plate: string;
  price: string;
  status: InventoryCreateListingStatus;
  stockNumber: string;
  title: string;
  transmission: InventoryTransmission | "";
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
    | ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    | InventoryFormState[Field],
) => void;

export const listingStatusOptions: Array<{
  label: string;
  value: InventoryListingStatus;
}> = [
  { label: "Rascunho", value: "draft" },
  { label: "Disponivel", value: "available" },
  { label: "Em preparação", value: "in_preparation" },
  { label: "Reservado", value: "reserved" },
  { label: "Vendido", value: "sold" },
  { label: "Inativo", value: "inactive" },
];

export const createListingStatusOptions: Array<{
  label: string;
  value: InventoryCreateListingStatus;
}> = [
  { label: "Rascunho", value: "draft" },
  { label: "Disponivel", value: "available" },
  { label: "Em preparação", value: "in_preparation" },
  { label: "Inativo", value: "inactive" },
];

export const fuelTypeOptions: Array<{
  label: string;
  value: InventoryFuelType;
}> = [
  { label: "Flex", value: "flex" },
  { label: "Gasolina", value: "gasoline" },
  { label: "Etanol", value: "ethanol" },
  { label: "Diesel", value: "diesel" },
  { label: "Hibrido", value: "hybrid" },
  { label: "Eletrico", value: "electric" },
  { label: "Outro", value: "other" },
];

export const transmissionOptions: Array<{
  label: string;
  value: InventoryTransmission;
}> = [
  { label: "Manual", value: "manual" },
  { label: "Automatico", value: "automatic" },
  { label: "Automatizado", value: "automated" },
  { label: "CVT", value: "cvt" },
  { label: "Outro", value: "other" },
];

export const engineDisplacementOptions: Array<{
  label: string;
  value: InventoryEngineDisplacement;
}> = [...vehicleEngineDisplacementOptions];

export const engineAspirationOptions: Array<{
  label: string;
  value: InventoryEngineAspiration;
}> = [...vehicleEngineAspirationOptions];

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
  { label: "Em preparação", value: "in_preparation" },
  { label: "Reservada", value: "reserved" },
  { label: "Vendida", value: "sold" },
  { label: "Retirada", value: "retired" },
];

export function createInitialInventoryForm(): InventoryFormState {
  return {
    altText: "",
    catalog: null,
    colorName: "",
    colorStock: [{ colorName: "", quantity: "1" }],
    description: "",
    doors: "",
    engineAspiration: "",
    engineDisplacement: "",
    fuelType: "",
    internalNotes: "",
    manufactureYear: "",
    mediaKind: "photo",
    mileageKm: "",
    modelYear: "",
    plate: "",
    price: "",
    status: "draft",
    stockNumber: "",
    title: "",
    transmission: "",
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
      description: nullableRichTextDescription(form.description),
      catalog: form.catalog,
      doors: nullableNumber(form.doors),
      engineAspiration: form.engineAspiration || null,
      engineDisplacement: form.engineDisplacement || null,
      fuelType: form.fuelType || null,
      internalNotes: nullableText(form.internalNotes),
      manufactureYear: nullableNumber(form.manufactureYear),
      mileageKm: nullableNumber(form.mileageKm),
      modelYear: nullableNumber(form.modelYear),
      plate: nullablePlate(form.plate),
      priceCents: parsePriceCents(form.price),
      status: form.status,
      title: form.title.trim(),
      transmission: form.transmission || null,
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
    unit: createInventoryUnitsInput(form)[0] ?? {},
    units: createInventoryUnitsInput(form),
  };
}

export function validateInventoryForm(form: InventoryFormState): string | null {
  if (!form.title.trim()) return "Informe o titulo do anuncio.";

  if (parseRequiredNonNegativeInteger(form.mileageKm) === null) {
    return "Informe a quilometragem do veiculo, mesmo para 0 km.";
  }

  if (isZeroKmInventoryForm(form)) {
    if (createZeroKmUnitsInput(form).length === 0) {
      return "Informe ao menos uma cor com estoque para o veiculo 0 km.";
    }
  } else if (!normalizeVehicleColor(form.colorName)) {
    return "Informe a cor do veiculo.";
  }

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

export function isZeroKmInventoryForm(form: InventoryFormState): boolean {
  return parseRequiredNonNegativeInteger(form.mileageKm) === 0;
}

export function createInventoryUnitsInput(
  form: InventoryFormState,
): readonly CreateInventoryUnitInput[] {
  return isZeroKmInventoryForm(form)
    ? createZeroKmUnitsInput(form)
    : [
        {
          colorName: coerceVehicleColor(form.colorName),
          plate: nullablePlate(form.unitPlate || form.plate),
          stockNumber: nullableText(form.stockNumber),
          vin: nullableText(form.vin),
        },
      ];
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

function createZeroKmUnitsInput(
  form: InventoryFormState,
): readonly CreateInventoryUnitInput[] {
  const units = form.colorStock.flatMap((row) => {
    const colorName = normalizeVehicleColor(row.colorName);
    const quantity = parseRequiredNonNegativeInteger(row.quantity);
    if (!colorName || !quantity || quantity <= 0) return [];
    return Array.from({ length: quantity }, () => ({
      colorName,
      plate: null,
      stockNumber: null,
      vin: null,
    }));
  });

  const fallbackColor = normalizeVehicleColor(form.colorName);
  return units.length || !fallbackColor
    ? units
    : [{ colorName: fallbackColor, plate: null, stockNumber: null, vin: null }];
}

function nullableNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const number = Number(trimmed);
  return Number.isInteger(number) ? number : null;
}

function parseRequiredNonNegativeInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const number = Number(trimmed);
  return Number.isInteger(number) && number >= 0 ? number : null;
}
