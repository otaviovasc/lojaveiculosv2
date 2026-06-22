import type { AnalyticsDashboard, DashboardLoadStatus } from "./types";

export type DashboardBodyState = "loading" | "none" | "ready";

export function getDashboardBodyState(
  status: DashboardLoadStatus,
  dashboard: AnalyticsDashboard | null,
): DashboardBodyState {
  if (dashboard) return "ready";
  if (status.kind === "loading") return "loading";
  return "none";
}
