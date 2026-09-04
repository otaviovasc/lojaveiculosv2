import {
  createRuntimeActorAuth,
  createRuntimeFetch,
  readClerkToken,
  readRuntimeApiBaseUrl,
} from "../account/runtimeAuth";
import type { CredereSimulation } from "./types";

export const POLL_INTERVAL_MS = 5_000;
export const POLL_MAX_ATTEMPTS = 24;

export async function createRuntimeCredereOptions() {
  const accessToken = await readClerkToken();
  return {
    auth: createRuntimeActorAuth(accessToken),
    fetch: createRuntimeFetch(),
    ...readRuntimeApiBaseUrl(),
  };
}

export function upsertSimulation(
  list: CredereSimulation[],
  next: CredereSimulation,
): CredereSimulation[] {
  return list.some((item) => item.id === next.id)
    ? list.map((item) => (item.id === next.id ? next : item))
    : [next, ...list];
}
