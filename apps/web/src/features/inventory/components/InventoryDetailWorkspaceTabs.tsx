import {
  Car,
  FileText,
  History,
  Layers,
  Megaphone,
  Store,
  Wallet,
} from "lucide-react";
import { cx } from "../../../components/ui/featureShared";
import type { TabId } from "./InventoryDetailWorkspaceParts";

const inventoryDetailTabs = [
  { id: "geral", label: "Geral", icon: Car },
  { id: "financeiro", label: "Financeiro", icon: Wallet },
  { id: "anuncio", label: "Anúncio", icon: Megaphone },
  { id: "documentos", label: "Documentos", icon: FileText },
  { id: "historico", label: "Histórico", icon: History },
  { id: "vitrine", label: "Vitrine", icon: Store },
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
    <div className="custom-scrollbar -mx-1 select-none overflow-x-auto px-1">
      <nav
        aria-label="Abas do veículo"
        className="flex min-w-max items-center gap-1 rounded-2xl border border-line bg-app-elevated/35 p-1.5 md:min-w-0"
      >
        {inventoryDetailTabs.map((tab) => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              aria-pressed={active}
              className={cx(
                "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-black transition-all cursor-pointer md:flex-1",
                active
                  ? "border border-line bg-panel text-app-text"
                  : "border border-transparent text-muted hover:bg-panel/50 hover:text-app-text",
              )}
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              type="button"
            >
              <Icon
                className={cx(
                  "size-4 shrink-0 transition-colors",
                  active ? "text-accent-strong" : "text-muted/70",
                )}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
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
