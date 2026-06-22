export type InventoryRouteState = {
  createStep: "catalog" | "data" | "media" | "mode" | "review";
  listingId: string | null;
  screenMode: "create" | "list";
};

export function readInventoryRouteState(hash: string): InventoryRouteState {
  const query = hash.split("?")[1] ?? "";
  const params = new URLSearchParams(query);

  return {
    createStep: readCreateStep(params.get("step")),
    listingId: params.get("listing"),
    screenMode: params.get("view") === "create" ? "create" : "list",
  };
}

export function readCurrentInventoryRouteState() {
  if (typeof window === "undefined") {
    return {
      createStep: "mode",
      listingId: null,
      screenMode: "list",
    } satisfies InventoryRouteState;
  }

  return readInventoryRouteState(window.location.hash);
}

function readCreateStep(value: string | null): InventoryRouteState["createStep"] {
  if (
    value === "catalog" ||
    value === "data" ||
    value === "media" ||
    value === "review"
  ) {
    return value;
  }

  return "mode";
}
