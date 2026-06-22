import type { InventoryDetailSelectionState } from "../model/listCatalogModel";

export function InventoryListSelectionStatus({
  state,
}: {
  state: InventoryDetailSelectionState;
}) {
  if (state.kind === "idle") {
    return (
      <p className="rounded-lg border border-line bg-panel p-3 text-sm font-bold text-muted">
        Selecione um veiculo para abrir edicao, custos, workflow e midias.
      </p>
    );
  }

  if (state.kind === "loading") {
    return (
      <p className="rounded-lg border border-line bg-panel p-3 text-sm font-black text-muted">
        Carregando {state.listingId}.
      </p>
    );
  }

  if (state.kind === "error") {
    return (
      <p className="rounded-lg border border-line bg-panel p-3 text-sm font-black text-danger">
        {state.message}
      </p>
    );
  }

  return (
    <p className="rounded-lg border border-line bg-panel p-3 text-sm font-black text-accent-strong">
      Veiculo selecionado.
    </p>
  );
}
