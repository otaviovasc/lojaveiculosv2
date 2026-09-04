import {
  BarChart3,
  Clock3,
  Info,
  MessageCircle,
  Trophy,
  Users,
} from "lucide-react";
import type { ElementType, ReactNode } from "react";
import { InstagramLogo, OlxLogo, WhatsAppLogo } from "./CrmChannelLogos";
import {
  formatCrmStatisticsDay,
  formatCrmStatisticsDuration,
  formatCrmStatisticsSourceLabel,
} from "./crmStatisticsModel";
import type { CrmStatisticsResponse } from "./crmStatisticsTypes";

export function CrmStatsDashboard({ data }: { data: CrmStatisticsResponse }) {
  const maxDaily = Math.max(
    1,
    ...data.daily.map((item) => item.conversationsCreated),
  );
  return (
    <div className="crm-stats-dashboard">
      <div className="crm-stats-kpis">
        <CrmStatsCard
          icon={MessageCircle}
          label="Conversas iniciadas"
          note={`${data.summary.activeConversations} ativas agora`}
          tone="emerald"
          value={data.summary.conversationsCreated}
        />
        <CrmStatsCard
          icon={Clock3}
          label="Primeira resposta"
          note={`${data.summary.firstResponseSamples} amostras válidas`}
          tone="blue"
          value={formatCrmStatisticsDuration(
            data.summary.averageFirstResponseMs,
          )}
        />
        <CrmStatsCard
          icon={BarChart3}
          label="Atendimento humano"
          note={`${data.summary.automatedHandledConversations} com automação`}
          tone="violet"
          value={data.summary.humanHandledConversations}
        />
        <CrmStatsCard
          icon={Trophy}
          label="Leads ganhos"
          note={`${data.summary.scheduledVisits} visitas agendadas`}
          tone="amber"
          value={data.summary.wonLeads}
        />
      </div>

      <div className="crm-stats-grid">
        <CrmStatsPanel
          badge={`${data.daily.length} dias`}
          title="Evolução diária"
          wide
        >
          <div className="crm-stats-trend">
            {data.daily.map((item) => (
              <div className="crm-stats-trend-row" key={item.date}>
                <time>{formatCrmStatisticsDay(item.date)}</time>
                <span>
                  <i
                    style={{
                      width: `${Math.max(3, (item.conversationsCreated / maxDaily) * 100)}%`,
                    }}
                  />
                </span>
                <strong>{item.conversationsCreated}</strong>
                <small>
                  <span>
                    <em className="crm-stats-tag-dot" data-type="inbound" />
                    {item.inboundMessages} recebidas
                  </span>
                  <span>·</span>
                  <span>
                    <em className="crm-stats-tag-dot" data-type="human" />
                    {item.humanOutboundMessages} humanas
                  </span>
                  <span>·</span>
                  <span>
                    <em className="crm-stats-tag-dot" data-type="ai" />
                    {item.externalAiOutboundMessages} IA externa
                  </span>
                  <span>·</span>
                  <span>
                    <em className="crm-stats-tag-dot" data-type="auto" />
                    {item.internalAutomationOutboundMessages} automação interna
                  </span>
                </small>
              </div>
            ))}
          </div>
        </CrmStatsPanel>

        <CrmStatsPanel title="Funil operacional">
          <CrmStatsBreakdown
            rows={[
              ["Novas", data.summary.conversationsCreated, "emerald"],
              [
                "Com atendimento",
                data.summary.humanHandledConversations,
                "blue",
              ],
              ["Visitas", data.summary.scheduledVisits, "violet"],
              ["Leads ganhos", data.summary.wonLeads, "amber"],
            ]}
            total={data.summary.conversationsCreated}
          />
        </CrmStatsPanel>

        <CrmStatsPanel title="Filas agora">
          <CrmStatsBreakdown
            rows={[
              ["Novas", data.queues.fresh, "emerald"],
              ["Sem responsável", data.queues.unassigned, "amber"],
              ["Atribuídas", data.queues.assigned, "blue"],
              ["Aguardando humano", data.queues.waitingHuman, "purple"],
              ["Em atendimento", data.queues.inHumanService, "blue"],
              ["Concluídas", data.queues.completed, "emerald"],
            ]}
          />
        </CrmStatsPanel>

        <CrmStatsPanel title="Origem das conversas">
          <CrmStatsBreakdown
            rows={data.bySource.map((item) => [
              formatCrmStatisticsSourceLabel(item.label || item.key),
              item.count,
              "blue" as const,
            ])}
          />
        </CrmStatsPanel>

        <CrmStatsPanel title="Canais">
          <CrmStatsChannelBreakdown
            rows={data.byChannel.map((item) => ({
              count: item.count,
              key: item.key,
              label: item.label,
            }))}
          />
        </CrmStatsPanel>

        <CrmStatsPanel title="Mensagens" wide>
          <CrmStatsBreakdown
            columns={2}
            rows={[
              ["Recebidas", data.messages.inbound, "emerald"],
              ["Enviadas por pessoas", data.messages.humanOutbound, "blue"],
              [
                "Enviadas por IA externa",
                data.messages.externalAiOutbound,
                "purple",
              ],
              [
                "Automação interna/sistema",
                data.messages.internalAutomationOutbound,
                "amber",
              ],
              ["Outras saídas", data.messages.otherOutbound, "violet"],
              ["Total", data.messages.total, "emerald"],
            ]}
          />
          <p className="crm-stats-message-note">
            <Info aria-hidden="true" />
            <span>
              V2 distingue IA externa pela origem canônica. Automação interna e
              mensagens de sistema permanecem agrupadas; não há sinal canônico
              separado para “minibot”.
            </span>
          </p>
        </CrmStatsPanel>

        <CrmStatsPanel
          badge={`${data.agents.length} ativos`}
          title="Desempenho da equipe"
          wide
        >
          <CrmStatsAgentTable data={data} />
          <p className="crm-stats-attribution">
            <Info aria-hidden="true" />
            <span>
              Atribuição por responsável atual da conversa; mudanças de
              responsável podem alterar a leitura histórica.
            </span>
          </p>
        </CrmStatsPanel>
      </div>
    </div>
  );
}

export function CrmStatsSkeleton() {
  return (
    <div className="crm-stats-skeleton" aria-label="Carregando estatísticas">
      <i />
      <i />
      <i />
      <i />
    </div>
  );
}

function CrmStatsCard({
  icon: Icon,
  label,
  note,
  tone,
  value,
}: {
  icon: ElementType;
  label: string;
  note: string;
  tone: "amber" | "blue" | "emerald" | "violet";
  value: number | string;
}) {
  return (
    <article className="crm-stats-kpi" data-tone={tone}>
      <span aria-hidden="true" className="crm-stats-kpi-watermark">
        <Icon />
      </span>
      <div className="crm-stats-kpi-top">
        <span className="crm-stats-kpi-icon">
          <Icon aria-hidden="true" />
        </span>
        <small className="crm-stats-kpi-label">{label}</small>
      </div>
      <div className="crm-stats-kpi-content">
        <strong className="crm-stats-kpi-value">{value}</strong>
        <p className="crm-stats-kpi-note">{note}</p>
      </div>
    </article>
  );
}

function CrmStatsPanel({
  badge,
  children,
  title,
  wide = false,
}: {
  badge?: string;
  children: ReactNode;
  title: string;
  wide?: boolean;
}) {
  return (
    <article
      className={`crm-stats-panel${wide ? " crm-stats-panel-wide" : ""}`}
    >
      <header className="crm-stats-panel-header">
        <h3>{title}</h3>
        {badge ? <span className="crm-stats-panel-badge">{badge}</span> : null}
      </header>
      {children}
    </article>
  );
}

function CrmStatsBreakdown({
  columns = 1,
  rows,
  total,
}: {
  columns?: 1 | 2;
  rows: Array<
    | readonly [string, number]
    | readonly [
        string,
        number,
        "amber" | "blue" | "emerald" | "purple" | "rose" | "violet",
      ]
  >;
  total?: number;
}) {
  const max = total ?? Math.max(1, ...rows.map((row) => row[1]));
  return rows.length ? (
    <div
      className="crm-stats-breakdown"
      data-columns={columns > 1 ? columns : undefined}
    >
      {rows.map(([label, value, tone]) => {
        const percentage = max > 0 ? Math.round((value / max) * 100) : 0;
        return (
          <div className="crm-stats-breakdown-row" key={label}>
            <div className="crm-stats-breakdown-meta">
              <span className="crm-stats-breakdown-label">{label}</span>
              <div className="crm-stats-breakdown-value-group">
                <b className="crm-stats-breakdown-value">{value}</b>
                <span className="crm-stats-breakdown-percentage">
                  {percentage}%
                </span>
              </div>
            </div>
            <span className="crm-stats-breakdown-track">
              <em
                className="crm-stats-breakdown-fill"
                data-tone={tone ?? "emerald"}
                style={{ width: `${Math.min(100, Math.max(2, percentage))}%` }}
              />
            </span>
          </div>
        );
      })}
    </div>
  ) : (
    <p className="crm-stats-muted">Sem dados no período.</p>
  );
}

function CrmStatsChannelBreakdown({
  rows,
}: {
  rows: Array<{ count: number; key: string; label: string }>;
}) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  if (!rows.length) {
    return <p className="crm-stats-muted">Sem canais com atividade.</p>;
  }

  const isSingleChannel = rows.length === 1;

  return (
    <div className="crm-stats-breakdown">
      {rows.map(({ count, key, label }) => {
        const percentage = max > 0 ? Math.round((count / max) * 100) : 0;
        const normalizedKey = key.toLowerCase();
        const isWhatsapp =
          normalizedKey.includes("whatsapp") || normalizedKey.includes("zapi");
        const isInstagram = normalizedKey.includes("instagram");
        const isOlx = normalizedKey.includes("olx");

        const tone = isWhatsapp
          ? "emerald"
          : isInstagram
            ? "rose"
            : isOlx
              ? "purple"
              : "blue";

        return (
          <div className="crm-stats-breakdown-row" key={key}>
            <div className="crm-stats-breakdown-meta">
              <span className="crm-stats-breakdown-label">
                <span
                  className="crm-stats-breakdown-icon"
                  data-channel={
                    isWhatsapp
                      ? "whatsapp"
                      : isInstagram
                        ? "instagram"
                        : isOlx
                          ? "olx"
                          : undefined
                  }
                >
                  {isWhatsapp ? (
                    <WhatsAppLogo />
                  ) : isInstagram ? (
                    <InstagramLogo />
                  ) : isOlx ? (
                    <OlxLogo />
                  ) : (
                    <MessageCircle aria-hidden="true" />
                  )}
                </span>
                <strong>{label}</strong>
              </span>
              <div className="crm-stats-breakdown-value-group">
                <b className="crm-stats-breakdown-value">{count}</b>
                <span className="crm-stats-breakdown-percentage">
                  {percentage}%
                </span>
              </div>
            </div>
            <span className="crm-stats-breakdown-track">
              <em
                className="crm-stats-breakdown-fill"
                data-tone={tone}
                style={{ width: `${Math.min(100, Math.max(2, percentage))}%` }}
              />
            </span>
            {isSingleChannel ? (
              <div className="crm-stats-channel-single-info">
                <span className="crm-stats-channel-single-badge">
                  Canal exclusivo
                </span>
                <p>100% das conversas registradas no período.</p>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function CrmStatsAgentTable({ data }: { data: CrmStatisticsResponse }) {
  if (!data.agents.length) {
    return (
      <p className="crm-stats-muted">
        Nenhum responsável com atividade no período.
      </p>
    );
  }
  return (
    <div className="crm-stats-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Responsável atual</th>
            <th>Atendidas</th>
            <th>Em aberto</th>
            <th>Mensagens</th>
            <th>Resposta</th>
          </tr>
        </thead>
        <tbody>
          {data.agents.map((agent) => {
            const responseSpeed =
              agent.averageFirstResponseMs === null
                ? undefined
                : agent.averageFirstResponseMs < 300_000
                  ? "fast"
                  : agent.averageFirstResponseMs < 1_800_000
                    ? "normal"
                    : "slow";
            const initial = agent.name.charAt(0).toUpperCase();

            return (
              <tr key={agent.agentId}>
                <td>
                  <div className="crm-stats-agent-cell">
                    <span aria-hidden="true" className="crm-stats-agent-avatar">
                      {initial || <Users aria-hidden="true" />}
                    </span>
                    <div className="crm-stats-agent-info">
                      <strong>{agent.name}</strong>
                      <small>{agent.role}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="crm-stats-metric-pill">
                    {agent.handledConversations}
                  </span>
                </td>
                <td>
                  <span className="crm-stats-metric-pill">
                    {agent.openAssignments}
                  </span>
                </td>
                <td>
                  <span className="crm-stats-metric-pill">
                    {agent.humanOutboundMessages}
                  </span>
                </td>
                <td>
                  <span
                    className="crm-stats-response-pill"
                    data-speed={responseSpeed}
                  >
                    <Clock3 aria-hidden="true" className="size-3" />
                    {formatCrmStatisticsDuration(agent.averageFirstResponseMs)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
