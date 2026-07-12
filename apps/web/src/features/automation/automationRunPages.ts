import type { AutomationRunList, AutomationRunSummary } from "./types";

export const AUTOMATION_RUN_PAGE_SIZE = 40;

export function nextAutomationOffset(response: AutomationRunList) {
  if (response.data.length === 0) return response.meta.total;
  return Math.min(
    response.meta.total,
    response.meta.offset + response.data.length,
  );
}

export function mergeAutomationRunPages(
  current: AutomationRunSummary[],
  next: AutomationRunSummary[],
) {
  const merged = new Map(current.map((run) => [run.id, run]));
  for (const run of next) merged.set(run.id, run);
  return [...merged.values()];
}
