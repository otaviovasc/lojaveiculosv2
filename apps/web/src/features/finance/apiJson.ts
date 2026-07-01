import { readApiJson, readApiVoid } from "../../lib/apiErrors";

export type JsonBody = Record<string, unknown>;

export async function readJson<T>(response: Response): Promise<T> {
  return readApiJson<T>(response, { feature: "Financeiro" });
}

export async function readUpload(response: Response): Promise<void> {
  return readApiVoid(response, { feature: "Documentos financeiros" });
}

export function cleanJson(body: JsonBody) {
  return Object.fromEntries(
    Object.entries(body).filter(([, value]) => value !== undefined),
  );
}
