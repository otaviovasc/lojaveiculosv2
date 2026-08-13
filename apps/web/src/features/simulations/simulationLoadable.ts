/**
 * Small local Loadable<T> state for Credere simulation requests, mirroring
 * the inventory enrichment pattern: ad-hoc `{loading, error}` pairs collapse
 * into one discriminated union and errors keep the provider request id when
 * the API supplies one.
 */
export type SimulationLoadable<T> =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; value: T }
  | { kind: "error"; message: string; requestId?: string };
