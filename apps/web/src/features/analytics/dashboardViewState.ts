import type { DashboardLoadStatus, HomeDashboard } from "./types";

export type DashboardBodyState = "loading" | "none" | "ready";

export function getDashboardBodyState(
  status: DashboardLoadStatus,
  dashboard: HomeDashboard | null,
): DashboardBodyState {
  if (dashboard) return "ready";
  if (status.kind === "loading") return "loading";
  return "none";
}
