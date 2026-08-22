import type { CSSProperties } from "react";
import {
  BadgeDollarSign,
  Banknote,
  BarChart3,
  CarFront,
  Filter,
  Handshake,
  ShieldCheck,
  Store,
  UsersRound,
} from "lucide-react";
import {
  FeatureDateField,
  FeatureSelect,
} from "../../../components/ui/FeatureControls";
import {
  FeatureActionButton,
  FeatureSection,
  FeatureToolbar,
} from "../../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureEmptyState,
} from "../../../components/ui/FeatureStates";
import type { AgencyStatsPeriod, AgencyStatsReport } from "../apiClient";
import {
  money,
  number,
  percent,
  reportHasActivity,
} from "./AgencyStatsPage.model";
import { AgencyStatsStoresTable } from "./AgencyStatsStoresTable";

export function AgencyStatsFilters({
  draftPeriod,
  onApplyPeriod,
  onDraftPeriodChange,
  onPeriodPreset,
  onStoreChange,
  period,
  report,
  storeId,
}: {
  draftPeriod: AgencyStatsPeriod;
  onApplyPeriod: () => void;
  onDraftPeriodChange: (period: AgencyStatsPeriod) => void;
  onPeriodPreset: (days: number) => void;
  onStoreChange: (storeId: string) => void;
  period: AgencyStatsPeriod;
  report: AgencyStatsReport | null;
  storeId?: string;
}) {
  return (
    <FeatureToolbar
      className="agency-stats-filters"
      eyebrow="Recorte da análise"
    >
      <div className="agency-stats-filters__row">
        <label className="agency-stats-control">
          <span>Loja</span>
          <FeatureSelect
            ariaLabel="Loja da análise"
            disabled={!report?.availableStores.length}
            onChange={onStoreChange}
            options={[
              { label: "Todas as lojas", value: "all" },
              ...(report?.availableStores.map((store) => ({
                label: store.storeName,
                value: store.storeId,
              })) ?? []),
            ]}
            searchable={(report?.availableStores.length ?? 0) > 8}
            searchPlaceholder="Buscar loja"
            value={storeId ?? "all"}
          />
        </label>

        <div className="agency-stats-control agency-stats-presets">
          <span>Período rápido</span>
          <div aria-label="Períodos rápidos" role="group">
            {[7, 30, 90].map((days) => (
              <button
                aria-pressed={isPreset(period, days)}
                key={days}
                onClick={() => onPeriodPreset(days)}
                type="button"
              >
                {days} dias
              </button>
            ))}
          </div>
        </div>

        <div className="agency-stats-control agency-stats-custom-period">
          <span>Período personalizado</span>
          <div>
            <FeatureDateField
              label="Data inicial"
              max={draftPeriod.to}
              onChange={(from) =>
                onDraftPeriodChange({
                  ...draftPeriod,
                  from: from || period.from,
                })
              }
              value={draftPeriod.from}
            />
            <FeatureDateField
              label="Data final"
              min={draftPeriod.from}
              onChange={(to) =>
                onDraftPeriodChange({ ...draftPeriod, to: to || period.to })
              }
              value={draftPeriod.to}
            />
            <FeatureActionButton
              disabled={
                draftPeriod.from > draftPeriod.to ||
                (draftPeriod.from === period.from &&
                  draftPeriod.to === period.to)
              }
              icon={Filter}
              label="Aplicar período"
              onClick={onApplyPeriod}
            />
          </div>
        </div>
      </div>
    </FeatureToolbar>
  );
}

export function AgencyStatsKpis({ report }: { report: AgencyStatsReport }) {
  const kpis = [
    {
      detail: `${number(report.totals.sales.closedCount)} vendas fechadas`,
      icon: Banknote,
      label: "Faturamento no período",
      tone: "success",
      value: money(report.totals.sales.revenueCents),
    },
    {
      detail: `${money(report.totals.sales.grossMarginCents)} de margem bruta`,
      icon: Handshake,
      label: "Vendas",
      tone: "info",
      value: number(report.totals.sales.closedCount),
    },
    {
      detail: "Média das vendas fechadas",
      icon: BadgeDollarSign,
      label: "Ticket médio",
      tone: "warning",
      value: money(report.totals.sales.averageTicketCents),
    },
    {
      detail: `${percent(report.totals.leads.conversionRate)} ganhos sobre os leads`,
      icon: UsersRound,
      label: "Leads no período",
      tone: "accent",
      value: number(report.totals.leads.totalCount),
    },
  ] as const;

  return (
    <section
      aria-label="Indicadores comerciais da agência"
      className="agency-stats-kpis"
    >
      {kpis.map(({ detail, icon: Icon, label, tone, value }) => (
        <article
          className={`agency-stats-kpi agency-stats-kpi--${tone}`}
          key={label}
        >
          <span aria-hidden="true">
            <Icon />
          </span>
          <div>
            <small>{label}</small>
            <strong>{value}</strong>
            <p>{detail}</p>
          </div>
        </article>
      ))}
    </section>
  );
}

export function AgencyStatsInventoryStrip({
  report,
}: {
  report: AgencyStatsReport;
}) {
  return (
    <section
      aria-label="Posição atual do estoque"
      className="agency-stats-inventory-strip"
    >
      <div>
        <Store aria-hidden="true" />
        <span>Lojas no recorte</span>
        <strong>{report.totals.storeCount}</strong>
      </div>
      <div>
        <CarFront aria-hidden="true" />
        <span>Veículos cadastrados</span>
        <strong>{number(report.totals.inventory.totalListings)}</strong>
      </div>
      <div>
        <CarFront aria-hidden="true" />
        <span>Disponíveis agora</span>
        <strong>{number(report.totals.inventory.availableListings)}</strong>
      </div>
      <div>
        <Handshake aria-hidden="true" />
        <span>Reservados agora</span>
        <strong>{number(report.totals.inventory.reservedUnits)}</strong>
      </div>
    </section>
  );
}

export function AgencyStatsCharts({ report }: { report: AgencyStatsReport }) {
  return (
    <div className="agency-stats-charts">
      <AgencyBarSection
        data={report.stores.map((store) => ({
          key: store.storeId,
          label: store.storeName,
          formatted: money(store.sales.revenueCents),
          value: store.sales.revenueCents,
        }))}
        emptyBody="Nenhuma venda fechada neste recorte."
        title="Faturamento por loja"
      />
      <AgencyBarSection
        data={report.leadSources.map((source) => ({
          key: source.key,
          label: source.label,
          formatted: number(source.count),
          value: source.count,
        }))}
        emptyBody="Nenhum lead foi criado neste período."
        title="Origem dos leads"
      />
    </div>
  );
}

export function AgencyStatsReportContent({
  report,
}: {
  report: AgencyStatsReport;
}) {
  if (!report.availableStores.length) {
    return (
      <FeatureEmptyState
        body="Cadastre a primeira loja da agência para ativar esta visão consolidada."
        icon={Store}
        title="A rede ainda não possui lojas"
      />
    );
  }
  return (
    <div className="agency-stats-report">
      {!reportHasActivity(report) ? (
        <FeatureAlert title="Sem movimentação neste recorte" tone="info">
          Os indicadores permanecem em zero porque não há vendas, leads ou
          estoque registrado para o período e a loja selecionados.
        </FeatureAlert>
      ) : null}
      <AgencyStatsKpis report={report} />
      <AgencyStatsInventoryStrip report={report} />
      <AgencyStatsCharts report={report} />
      <AgencyStatsStoresTable stores={report.stores} />
      <p className="agency-stats-source-note">
        <ShieldCheck aria-hidden="true" /> Fonte: vendas fechadas e leads
        criados no período; estoque atual. Métricas de tráfego e cliques só
        aparecerão quando houver telemetria validada no V2.
      </p>
    </div>
  );
}

function AgencyBarSection({
  data,
  emptyBody,
  title,
}: {
  data: readonly {
    formatted: string;
    key: string;
    label: string;
    value: number;
  }[];
  emptyBody: string;
  title: string;
}) {
  const positive = data.filter((item) => item.value > 0);
  const max = Math.max(...positive.map((item) => item.value), 0);
  return (
    <FeatureSection
      icon={<BarChart3 aria-hidden="true" className="size-4" />}
      padding="compact"
      title={title}
    >
      {positive.length ? (
        <ol aria-label={title} className="agency-stats-bars">
          {positive.map((item) => (
            <li key={item.key}>
              <div>
                <span>{item.label}</span>
                <strong>{item.formatted}</strong>
              </div>
              <span aria-hidden="true" className="agency-stats-bars__track">
                <span
                  style={
                    {
                      "--agency-stats-bar": `${(item.value / max) * 100}%`,
                    } as CSSProperties
                  }
                />
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <FeatureEmptyState
          body={emptyBody}
          density="compact"
          icon={BarChart3}
          title={`Sem dados em ${title.toLocaleLowerCase("pt-BR")}`}
          tone="neutral"
        />
      )}
    </FeatureSection>
  );
}

function isPreset(period: AgencyStatsPeriod, days: number) {
  const from = Date.parse(`${period.from}T00:00:00.000Z`);
  const to = Date.parse(`${period.to}T00:00:00.000Z`);
  return (
    Number.isFinite(from) &&
    Number.isFinite(to) &&
    Math.round((to - from) / 86400000) + 1 === days
  );
}
