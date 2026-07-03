import type { CrmWhatsappCatalogProduct } from "../../domains/crm/ports/crmWhatsappGateway.js";
import { readString } from "./zapiCrmWhatsappGatewaySupport.js";

export function readZapiCatalogProducts(
  value: unknown,
): CrmWhatsappCatalogProduct[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) =>
      item && typeof item === "object"
        ? readCatalogProduct(item as Record<string, unknown>)
        : null,
    )
    .filter((item): item is CrmWhatsappCatalogProduct => Boolean(item));
}

function readCatalogProduct(
  item: Record<string, unknown>,
): CrmWhatsappCatalogProduct | null {
  const id = readString(item.id);
  const name = readString(item.name);
  if (!id || !name) return null;
  return {
    availability: readString(item.availability),
    currency: readString(item.currency),
    description: readString(item.description),
    id,
    images: readStringArray(item.images),
    name,
    price: readLooseString(item.price),
    quantity: readNumber(item.quantity),
    retailerId: readString(item.retailerId),
    salePrice: readLooseString(item.salePrice),
  };
}

function readLooseString(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return readString(value);
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string => typeof item === "string" && Boolean(item.trim()),
  );
}
