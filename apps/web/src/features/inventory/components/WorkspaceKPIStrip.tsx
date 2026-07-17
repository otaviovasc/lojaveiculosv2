import {
  BadgeCheck,
  Briefcase,
  Clock,
  Coins,
  Shield,
  Tag,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cx } from "../../../components/ui/featureShared";

export function WorkspaceKPIStrip({
  salePrice,
  acquisitionPrice,
  margin,
  stockTime,
  renaveStatus,
}: {
  salePrice: string;
  acquisitionPrice: string;
  margin: string;
  stockTime: string;
  renaveStatus: string;
}) {
  return (
    <div className="flex flex-col lg:flex-row gap-4 justify-between lg:items-center bg-panel/30 border border-line/60 rounded-2xl p-4.5">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 flex-1 min-w-0">
        <KPIItem
          icon={Tag}
          tile="bg-accent-soft text-accent-strong"
          label="Preço de Venda"
          value={salePrice}
          valueClassName="text-accent-strong"
        />
        <KPIItem
          icon={Coins}
          tile="bg-blue-500/10 text-blue-500"
          label="Custos Registrados"
          value={acquisitionPrice}
          valueClassName="text-app-text"
        />
        <KPIItem
          icon={TrendingUp}
          tile="bg-emerald-500/10 text-emerald-500"
          label="Margem Base"
          value={margin}
          valueClassName="text-success-strong"
        />
        <KPIItem
          icon={Clock}
          tile="bg-amber-500/10 text-amber-600"
          label="Tempo em Pátio"
          value={stockTime}
          valueClassName="text-warning-strong"
        />
        <KPIItem
          icon={BadgeCheck}
          tile="bg-violet-500/10 text-violet-500"
          label="Status do Anúncio"
          value={renaveStatus}
          valueClassName="text-app-text"
        />
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-line/60 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-app-elevated px-3.5 py-1.5 text-xs font-black text-muted"
          title="O financiamento é configurado durante a formalização da venda"
        >
          <Briefcase className="size-3.5" />
          <span>Financiamento na venda</span>
        </span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-app-elevated px-3.5 py-1.5 text-xs font-black text-muted"
          title="O seguro é configurado durante a formalização da venda"
        >
          <Shield className="size-3.5" />
          <span>Seguro na venda</span>
        </span>
      </div>
    </div>
  );
}

function KPIItem({
  icon: Icon,
  tile,
  label,
  value,
  valueClassName,
}: {
  icon: LucideIcon;
  tile: string;
  label: string;
  value: string;
  valueClassName: string;
}) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <span
        className={cx(
          "flex size-9 shrink-0 items-center justify-center rounded-xl",
          tile,
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <span className="block text-xs font-black uppercase tracking-wider text-muted truncate">
          {label}
        </span>
        <span
          className={cx(
            "mt-0.5 block text-base font-black truncate",
            valueClassName,
          )}
        >
          {value}
        </span>
      </div>
    </div>
  );
}
