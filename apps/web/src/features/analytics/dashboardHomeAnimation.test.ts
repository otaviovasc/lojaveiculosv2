import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  DASHBOARD_ENTRY_INITIAL,
  DASHBOARD_RESOURCE_PRESENCE_INITIAL,
  DASHBOARD_RESOURCE_PRESENCE_MODE,
  DASHBOARD_RESOURCE_SLIDE_CLASS,
  DASHBOARD_ENTRY_ANIMATE,
  DASHBOARD_ENTRY_DELAY_SCALE,
  DASHBOARD_ENTRY_DURATION,
  getDashboardEntryMotion,
  dashboardResources,
  getDashboardResource,
  getNextDashboardResourceIndex,
} from "./dashboardHomeAnimation";

const dashboardHomeSource = readFileSync(
  fileURLToPath(new URL("../../components/DashboardHome.tsx", import.meta.url)),
  "utf8",
);
const appShellSource = readFileSync(
  fileURLToPath(new URL("../../components/AppShell.tsx", import.meta.url)),
  "utf8",
);
const agencyCssSource = readFileSync(
  fileURLToPath(new URL("../../styles/agency.css", import.meta.url)),
  "utf8",
);

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
    expect(dashboardHomeSource).not.toContain("duration: 0.3");
  });

  it("keeps the resource carousel from rendering an exit-only blank frame", () => {
    expect(DASHBOARD_RESOURCE_PRESENCE_MODE).toBe("sync");
    expect(DASHBOARD_RESOURCE_PRESENCE_INITIAL).toBe(false);
    expect(DASHBOARD_RESOURCE_SLIDE_CLASS.split(" ")).toEqual(
      expect.arrayContaining(["absolute", "inset-0"]),
    );
  });

  it("keeps resource backgrounds on animated slides, not the static parent", () => {
    expect(dashboardHomeSource).toContain(
      "className={`${DASHBOARD_RESOURCE_SLIDE_CLASS} ${currentResource.panelClass}`}",
    );
    expect(dashboardHomeSource).not.toContain(
      '"+\\n              currentResource.panelClass',
    );
  });

  it("keeps agency fade-in CSS from applying to the store shell", () => {
    expect(appShellSource).not.toContain("animate-fade-in");
    expect(appShellSource).toContain("mobile-nav-enter");
    expect(agencyCssSource).toContain(".agency-layout .animate-fade-in");
    expect(agencyCssSource).not.toMatch(/^\.animate-fade-in/m);
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
