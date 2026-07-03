import { CrmWhatsappGatewayError } from "../../domains/crm/ports/crmWhatsappGateway.js";
import { readZapiCatalogProducts } from "./zapiCrmWhatsappCatalogPayload.js";
import {
  buildInstanceUrl,
  createProviderMessageId,
  parseJson,
  readString,
  summarize,
  type ZapiCredentials,
} from "./zapiCrmWhatsappGatewaySupport.js";
import type {
  CrmWhatsappListCatalogProductsInput,
  CrmWhatsappSendCatalogInput,
  CrmWhatsappSendProductInput,
} from "../../domains/crm/ports/crmWhatsappGateway.js";

export async function listZapiCatalogProducts(
  credentials: ZapiCredentials,
  fetchImpl: typeof fetch,
  input: CrmWhatsappListCatalogProductsInput,
) {
  const path = input.catalogPhone
    ? `/catalogs/${encodeURIComponent(input.catalogPhone)}`
    : "/catalogs";
  const response = await fetchImpl(`${buildInstanceUrl(credentials)}${path}`, {
    body: JSON.stringify(
      input.nextCursor ? { nextCursor: input.nextCursor } : {},
    ),
    headers: {
      Accept: "application/json",
      "Client-Token": credentials.clientToken,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const text = await response.text();
  const payload = parseJson(text);

  if (!response.ok) {
    throw new CrmWhatsappGatewayError(
      `ZAPI catalog list failed with HTTP ${response.status}: ${summarize(text)}`,
    );
  }

  return {
    cartEnabled:
      typeof payload.cartEnabled === "boolean" ? payload.cartEnabled : null,
    nextCursor:
      readString(payload.nextCursor) ?? readString(payload.cursor) ?? null,
    products: readZapiCatalogProducts(payload.products),
    raw: payload,
  };
}

export async function sendZapiCatalog(
  credentials: ZapiCredentials,
  fetchImpl: typeof fetch,
  input: CrmWhatsappSendCatalogInput,
) {
  return postZapiCatalogMessage(
    credentials,
    fetchImpl,
    "/send-catalog",
    {
      catalogPhone: input.catalogPhone,
      phone: input.phone,
      ...(input.catalogDescription
        ? { catalogDescription: input.catalogDescription }
        : {}),
      ...(input.message ? { message: input.message } : {}),
      ...(input.title ? { title: input.title } : {}),
      ...(input.translation ? { translation: input.translation } : {}),
    },
    "ZAPI send catalog",
  );
}

export async function sendZapiProduct(
  credentials: ZapiCredentials,
  fetchImpl: typeof fetch,
  input: CrmWhatsappSendProductInput,
) {
  return postZapiCatalogMessage(
    credentials,
    fetchImpl,
    "/send-product",
    {
      catalogPhone: input.catalogPhone,
      phone: input.phone,
      productId: input.productId,
    },
    "ZAPI send product",
  );
}

async function postZapiCatalogMessage(
  credentials: ZapiCredentials,
  fetchImpl: typeof fetch,
  path: string,
  body: Record<string, unknown>,
  label: string,
) {
  const response = await fetchImpl(`${buildInstanceUrl(credentials)}${path}`, {
    body: JSON.stringify(body),
    headers: {
      Accept: "application/json",
      "Client-Token": credentials.clientToken,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const text = await response.text();
  const payload = parseJson(text);

  if (!response.ok) {
    throw new CrmWhatsappGatewayError(
      `${label} failed with HTTP ${response.status}: ${summarize(text)}`,
    );
  }

  return {
    externalId: createProviderMessageId(payload),
    providerTimestamp: new Date(),
    raw: payload,
  };
}
