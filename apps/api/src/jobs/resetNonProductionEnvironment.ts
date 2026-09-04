import type { ResetCommand } from "./resetEnvironmentSafety.js";

export type ResetResourceSummary = Record<string, boolean | number | string>;

export type ResetResourceAdapter = {
  close?: () => Promise<void>;
  inspect: () => Promise<ResetResourceSummary>;
  name: string;
  reset: () => Promise<ResetResourceSummary>;
};

export type ResetReporter = (
  event: "apply" | "inspect",
  resource: string,
  summary: ResetResourceSummary,
) => void;

export async function resetNonProductionEnvironment(
  command: ResetCommand,
  adapters: readonly ResetResourceAdapter[],
  report: ResetReporter,
): Promise<void> {
  try {
    for (const adapter of adapters) {
      report("inspect", adapter.name, await adapter.inspect());
    }

    if (!command.apply) return;

    for (const adapter of adapters) {
      report("apply", adapter.name, await adapter.reset());
    }
  } finally {
    await closeAdapters(adapters);
  }
}

async function closeAdapters(
  adapters: readonly ResetResourceAdapter[],
): Promise<void> {
  const failures: Error[] = [];
  for (const adapter of [...adapters].reverse()) {
    if (!adapter.close) continue;
    try {
      await adapter.close();
    } catch (error) {
      failures.push(
        new Error(`Failed to close reset adapter ${adapter.name}.`, {
          cause: error,
        }),
      );
    }
  }
  if (failures.length > 0) {
    throw new AggregateError(failures, "Failed to close reset resources.");
  }
}
