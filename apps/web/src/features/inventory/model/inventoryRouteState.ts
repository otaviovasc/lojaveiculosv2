export type InventoryRouteState = {
  createStep: "catalog" | "data" | "media" | "mode" | "review";
  listingId: string | null;
  screenMode: "create" | "list";
  unitId: string | null;
};

export function readInventoryRouteState(hash: string): InventoryRouteState {
  const path = hash.replace(/^#\/?/, "").split("?")[0] ?? "";
  const query = hash.split("?")[1] ?? "";
  const params = new URLSearchParams(query);
  const segments = path.split("/").filter(Boolean);
  const isCreatePath =
    segments[0] === "inventory" &&
    (segments[1] === "create" || segments[1] === "new");

  return {
    createStep: readCreateStep(params.get("step") ?? segments[2] ?? null),
    listingId: params.get("listing"),
    screenMode:
      params.get("view") === "create" || isCreatePath ? "create" : "list",
    unitId: params.get("unit"),
  };
}

export function readCurrentInventoryRouteState() {
  if (typeof window === "undefined") {
    return {
      createStep: "mode",
      listingId: null,
      screenMode: "list",
      unitId: null,
    } satisfies InventoryRouteState;
  }

  return readInventoryRouteState(window.location.hash);
}

function readCreateStep(
  value: string | null,
): InventoryRouteState["createStep"] {
  if (
    value === "mode" ||
    value === "catalog" ||
    value === "data" ||
    value === "media" ||
    value === "review"
  ) {
    return value;
  }

  return "mode";
}

export function inventoryListHash() {
  return "/inventory";
}

export function inventoryCreateHash(
  step: InventoryRouteState["createStep"] = "mode",
) {
  return step === "mode" ? "/inventory/create" : `/inventory/create/${step}`;
}

export function writeInventoryScreenHash(
  screenMode: "create" | "detail" | "list",
  step: InventoryRouteState["createStep"] = "mode",
) {
  if (typeof window === "undefined" || screenMode === "detail") return;
  window.location.hash =
    screenMode === "create" ? inventoryCreateHash(step) : inventoryListHash();
}
