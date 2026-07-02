import { Layers } from "lucide-react";
import type { TabId } from "./InventoryDetailWorkspaceParts";

const inventoryDetailTabs = [
  "geral",
  "financeiro",
  "anuncio",
  "documentos",
  "vendas",
  "historico",
  "vitrine",
] as const;

export function InventoryDetailWorkspaceTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}) {
  return (
    <div className="custom-scrollbar border-b border-line overflow-x-auto select-none">
      <nav className="flex gap-6 min-w-max">
        {inventoryDetailTabs.map((tab) => (
          <button
            className={
              "pb-4 text-sm font-black transition-all border-b-2 cursor-pointer relative capitalize " +
              (activeTab === tab
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-app-text")
            }
            key={tab}
            onClick={() => onTabChange(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
      </nav>
    </div>
  );
}

export function InventoryDetailEmptyTab({ activeTab }: { activeTab: TabId }) {
  if (inventoryDetailTabs.includes(activeTab)) return null;

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
