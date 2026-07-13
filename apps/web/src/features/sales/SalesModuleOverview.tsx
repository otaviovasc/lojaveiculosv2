import { Banknote, Clock, FileText, TrendingUp } from "lucide-react";
import { FeaturePageHeader } from "../../components/ui/FeatureLayout";
import {
  FeatureKpiCard,
  FeatureKpiStrip,
} from "../../components/ui/FeatureKpis";
import { formatCents } from "./salesModel";
import type { SaleRecord } from "./types";

export function SalesModuleOverview({
  message,
  sales,
}: {
  message: string | null;
  sales: readonly SaleRecord[];
}) {
  const closedTotal = sales
    .filter((sale) => sale.status === "closed" && sale.isCurrentRevision)
    .reduce((total, sale) => total + (sale.salePriceCents ?? 0), 0);

  return (
    <>
      <FeaturePageHeader eyebrow="Comercial" title="Formalização de Vendas" />

      <FeatureKpiStrip ariaLabel="Resumo de vendas">
        <FeatureKpiCard
          icon={TrendingUp}
          label="Total de vendas"
          tone="blue"
          value={sales.length}
        />
        <FeatureKpiCard
          icon={FileText}
          label="Em edição"
          tone="violet"
          value={sales.filter((sale) => sale.status === "draft").length}
        />
        <FeatureKpiCard
          icon={Clock}
          label="Veículos reservados"
          tone="pink"
          value={sales.filter((sale) => sale.status === "pending").length}
        />
        <FeatureKpiCard
          icon={Banknote}
          label="Faturamento recebido"
          tone="green"
          value={formatCents(closedTotal)}
        />
      </FeatureKpiStrip>

      {message ? (
        <div className="rounded-2xl border border-line bg-panel p-4 text-sm font-black text-muted shadow-sm flex items-center gap-3">
          <span className="size-2 rounded-full bg-accent animate-ping" />
          <span>{message}</span>
        </div>
      ) : null}
    </>
  );
}
