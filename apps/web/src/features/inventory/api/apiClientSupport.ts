import type { CreateInventoryMediaInput } from "../model/types";
import { readApiJson, readApiVoid } from "../../../lib/apiErrors";

export type JsonBody = Record<string, unknown>;

export async function readJson<T>(response: Response): Promise<T> {
  return readApiJson<T>(response, { feature: "Inventory" });
}

export async function readVoid(response: Response): Promise<void> {
  return readApiVoid(response, { feature: "Inventory" });
}

export async function readUpload(response: Response): Promise<void> {
  return readApiVoid(response, { feature: "Inventory media upload" });
}

export function cleanJson(body: JsonBody) {
  return Object.fromEntries(
    Object.entries(body).filter(([, value]) => value !== undefined),
  );
}

export function cleanMediaInput(
  input: CreateInventoryMediaInput,
  storageKey: string,
): CreateInventoryMediaInput & { storageKey: string } {
  return {
    ...(input.altText !== undefined ? { altText: input.altText } : {}),
    ...(input.displayOrder !== undefined
      ? { displayOrder: input.displayOrder }
      : {}),
    kind: input.kind,
    storageKey,
  };
}
