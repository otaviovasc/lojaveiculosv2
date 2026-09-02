import { describe, expect, it } from "vitest";
import {
  DASHBOARD_CONTENT_ENTRY_DISTANCE,
  DASHBOARD_CONTENT_ENTRY_DURATION,
  DASHBOARD_CONTENT_ENTRY_EASE,
  DASHBOARD_CONTENT_ENTRY_THRESHOLD,
  DASHBOARD_ENTRY_INITIAL,
  DASHBOARD_RESOURCE_PRESENCE_INITIAL,
  DASHBOARD_RESOURCE_PRESENCE_MODE,
  DASHBOARD_RESOURCE_SLIDE_CLASS,
  DASHBOARD_ENTRY_ANIMATE,
  DASHBOARD_ENTRY_DELAY_SCALE,
  DASHBOARD_ENTRY_DURATION,
  DASHBOARD_KPI_ENTRY_DELAY_STEP,
  DASHBOARD_KPI_ENTRY_DISTANCE,
  DASHBOARD_KPI_ENTRY_DURATION,
  DASHBOARD_KPI_ENTRY_EASE,
  getDashboardEntryMotion,
  dashboardResources,
  getDashboardResource,
  getDashboardContentEntryConfig,
  getNextDashboardResourceIndex,
} from "./dashboardHomeAnimation";

describe("dashboard home animation contract", () => {
  it("uses a fast opacity entry without long blank stagger", () => {
    expect(DASHBOARD_ENTRY_INITIAL).toEqual({ opacity: 0, y: 8 });
    expect(DASHBOARD_ENTRY_ANIMATE).toEqual({ opacity: 1, y: 0 });
    expect(DASHBOARD_ENTRY_DURATION).toBeLessThanOrEqual(0.2);
    expect(DASHBOARD_ENTRY_DELAY_SCALE).toBeLessThanOrEqual(0.35);
    const motion = getDashboardEntryMotion(0.2);
    expect(motion).toMatchObject({
      animate: { opacity: 1, y: 0 },
      initial: { opacity: 0, y: 8 },
      transition: { duration: 0.18 },
    });
    expect(motion.transition.delay).toBeCloseTo(0.07);
  });

  it("keeps dashboard KPI cards aligned with the non-flickering inventory entrance", () => {
    expect(DASHBOARD_KPI_ENTRY_DELAY_STEP).toBe(0.04);
    expect(DASHBOARD_KPI_ENTRY_DISTANCE).toBe(DASHBOARD_CONTENT_ENTRY_DISTANCE);
    expect(DASHBOARD_KPI_ENTRY_DURATION).toBe(DASHBOARD_CONTENT_ENTRY_DURATION);
    expect(DASHBOARD_KPI_ENTRY_EASE).toBe(DASHBOARD_CONTENT_ENTRY_EASE);
    expect(DASHBOARD_KPI_ENTRY_DURATION).toBeLessThanOrEqual(0.6);
  });

  it("builds dashboard card entrance configuration from shared defaults", () => {
    expect(getDashboardContentEntryConfig(0.12)).toEqual({
      delay: 0.12,
      direction: "vertical",
      distance: DASHBOARD_CONTENT_ENTRY_DISTANCE,
      duration: DASHBOARD_CONTENT_ENTRY_DURATION,
      ease: DASHBOARD_CONTENT_ENTRY_EASE,
      reverse: false,
      threshold: DASHBOARD_CONTENT_ENTRY_THRESHOLD,
    });
    expect(
      getDashboardContentEntryConfig(0.2, {
        direction: "horizontal",
        distance: 12,
      }),
    ).toMatchObject({
      delay: 0.2,
      direction: "horizontal",
      distance: 12,
    });
  });

  it("keeps the resource carousel from rendering an exit-only blank frame", () => {
    expect(DASHBOARD_RESOURCE_PRESENCE_MODE).toBe("sync");
    expect(DASHBOARD_RESOURCE_PRESENCE_INITIAL).toBe(false);
    expect(DASHBOARD_RESOURCE_SLIDE_CLASS.split(" ")).toEqual(
      expect.arrayContaining(["absolute", "inset-0"]),
    );
  });

  it("keeps carousel rotation bounded to the available resources", () => {
    expect(dashboardResources).toHaveLength(3);
    expect(getNextDashboardResourceIndex(0, dashboardResources.length)).toBe(1);
    expect(getNextDashboardResourceIndex(2, dashboardResources.length)).toBe(0);
    expect(getNextDashboardResourceIndex(0, 0)).toBe(0);
  });

  it("falls back to the first resource for out-of-range indexes", () => {
    expect(getDashboardResource(99)).toMatchObject({
      panelClass: "dashboard-resource-api",
      title: "Estoque via API (Portais)",
    });
  });
});
