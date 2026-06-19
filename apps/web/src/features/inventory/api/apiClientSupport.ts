import type { CreateInventoryMediaInput } from "../model/types";

export type JsonBody = Record<string, unknown>;

export async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Inventory request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function readUpload(response: Response): Promise<void> {
  if (!response.ok) {
    throw new Error(
      `Inventory media upload failed with status ${response.status}`,
    );
  }
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
