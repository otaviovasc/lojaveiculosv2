import { Layers } from "lucide-react";
import type { TabId } from "./InventoryDetailWorkspaceParts";

const inventoryDetailTabs = [
  { id: "geral", label: "Geral" },
  { id: "financeiro", label: "Financeiro" },
  { id: "anuncio", label: "Anúncio" },
  { id: "documentos", label: "Documentos" },
  { id: "vendas", label: "Vendas" },
  { id: "historico", label: "Histórico" },
  { id: "vitrine", label: "Vitrine" },
] as const;

const inventoryDetailTabIds = inventoryDetailTabs.map((tab) => tab.id);

export function InventoryDetailWorkspaceTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}) {
  return (
    <div className="custom-scrollbar border-b border-line overflow-x-auto select-none">
      <nav aria-label="Abas do veículo" className="flex gap-6 min-w-max">
        {inventoryDetailTabs.map((tab) => (
          <button
            aria-pressed={activeTab === tab.id}
            className={
              "pb-4 text-sm font-black transition-all border-b-2 cursor-pointer relative " +
              (activeTab === tab.id
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-app-text")
            }
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

export function InventoryDetailEmptyTab({ activeTab }: { activeTab: TabId }) {
  if (inventoryDetailTabIds.includes(activeTab)) return null;

  return (
    <div className="flex flex-col items-center justify-center text-center py-20 bg-panel/30 border border-line border-dashed rounded-2xl">
      <Layers className="size-10 text-muted/50 mb-3" />
      <h4 className="text-sm font-black text-app-text capitalize">
        Painel de {activeTab}
      </h4>
      <p className="text-xs font-bold text-muted max-w-sm mt-1">
        Este submódulo está ativo. Use as ferramentas de ação no topo ou
        configure o veículo na aba Geral.
      </p>
    </div>
  );
}
