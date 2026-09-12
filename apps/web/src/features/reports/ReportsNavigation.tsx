import {
  BarChart3,
  Car,
  Crown,
  FileText,
  FolderArchive,
  Megaphone,
  MessageSquareText,
  ReceiptText,
  Tags,
  Warehouse,
  WalletCards,
} from "lucide-react";
import { FeatureTabs } from "../../components/ui/FeatureTabs";
import type { ReportTab } from "./types";

type ReportCategory = {
  icon: typeof Crown;
  id: string;
  label: string;
  tabs: ReadonlyArray<{
    icon: typeof Crown;
    label: string;
    value: ReportTab;
  }>;
};

const categories: readonly ReportCategory[] = [
  {
    icon: Crown,
    id: "owner",
    label: "Visão do dono",
    tabs: [
      { icon: BarChart3, label: "Resumo", value: "summary" },
      { icon: Car, label: "Vendidos", value: "sold" },
      { icon: Tags, label: "Custos e margens", value: "costs" },
    ],
  },
  {
    icon: WalletCards,
    id: "finance",
    label: "Financeiro e vendas",
    tabs: [
      { icon: ReceiptText, label: "Movimentações", value: "finance" },
      { icon: MessageSquareText, label: "CRM", value: "crm" },
    ],
  },
  {
    icon: Warehouse,
    id: "inventory",
    label: "Estoque e operação",
    tabs: [{ icon: Warehouse, label: "Giro de estoque", value: "inventory" }],
  },
  {
    icon: FolderArchive,
    id: "channels",
    label: "Canais e arquivos",
    tabs: [
      { icon: FileText, label: "Documentos", value: "documents" },
      { icon: Megaphone, label: "Marketing", value: "marketing" },
    ],
  },
];

export function ReportsNavigation({
  onChange,
  value,
}: {
  onChange: (tab: ReportTab) => void;
  value: ReportTab;
}) {
  const active =
    categories.find((category) =>
      category.tabs.some((tab) => tab.value === value),
    ) ?? categories[0]!;

  return (
    <nav aria-label="Categorias de relatórios" className="reports-nav">
      <div className="reports-category-list" role="group">
        {categories.map((category) => {
          const Icon = category.icon;
          const selected = category.id === active.id;
          return (
            <button
              aria-pressed={selected}
              className="reports-category"
              data-active={selected || undefined}
              key={category.id}
              onClick={() => onChange(category.tabs[0]!.value)}
              type="button"
            >
              <Icon aria-hidden="true" className="size-4" />
              <span>{category.label}</span>
            </button>
          );
        })}
      </div>
      <FeatureTabs
        activeClassName="is-active"
        ariaLabel={`Relatórios de ${active.label}`}
        className="reports-subtabs"
        onChange={onChange}
        optionClassName="reports-subtab"
        options={active.tabs}
        value={value}
      />
    </nav>
  );
}
