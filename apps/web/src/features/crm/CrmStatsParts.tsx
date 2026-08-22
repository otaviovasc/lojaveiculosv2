import { BarChart3, Clock3, MessageCircle, Trophy } from "lucide-react";
import type { ReactNode } from "react";
import {
  formatCrmStatisticsDay,
  formatCrmStatisticsDuration,
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
          value={data.summary.conversationsCreated}
          note={`${data.summary.activeConversations} ativas agora`}
        />
        <CrmStatsCard
          icon={Clock3}
          label="Primeira resposta"
          value={formatCrmStatisticsDuration(
            data.summary.averageFirstResponseMs,
          )}
          note={`${data.summary.firstResponseSamples} amostras válidas`}
        />
        <CrmStatsCard
          icon={BarChart3}
          label="Atendimento humano"
          value={data.summary.humanHandledConversations}
          note={`${data.summary.automatedHandledConversations} com automação`}
        />
        <CrmStatsCard
          icon={Trophy}
          label="Leads ganhos"
          value={data.summary.wonLeads}
          note={`${data.summary.scheduledVisits} visitas agendadas`}
        />
      </div>
      <div className="crm-stats-grid">
        <CrmStatsPanel title="Evolução diária" wide>
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
                  {item.inboundMessages} recebidas ·{" "}
                  {item.humanOutboundMessages} humanas ·{" "}
                  {item.externalAiOutboundMessages} IA externa ·{" "}
                  {item.internalAutomationOutboundMessages} automação interna
                </small>
              </div>
            ))}
          </div>
        </CrmStatsPanel>
        <CrmStatsPanel title="Funil operacional">
          <CrmStatsBreakdown
            rows={[
              ["Novas", data.summary.conversationsCreated],
              ["Com atendimento", data.summary.humanHandledConversations],
              ["Visitas", data.summary.scheduledVisits],
              ["Leads ganhos", data.summary.wonLeads],
            ]}
          />
        </CrmStatsPanel>
        <CrmStatsPanel title="Filas agora">
          <CrmStatsBreakdown
            rows={[
              ["Novas", data.queues.fresh],
              ["Sem responsável", data.queues.unassigned],
              ["Atribuídas", data.queues.assigned],
              ["Aguardando humano", data.queues.waitingHuman],
              ["Em atendimento", data.queues.inHumanService],
              ["Concluídas", data.queues.completed],
            ]}
          />
        </CrmStatsPanel>
        <CrmStatsPanel title="Origem das conversas">
          <CrmStatsBreakdown
            rows={data.bySource.map((item) => [item.label, item.count])}
          />
        </CrmStatsPanel>
        <CrmStatsPanel title="Canais">
          <CrmStatsBreakdown
            rows={data.byChannel.map((item) => [item.label, item.count])}
          />
        </CrmStatsPanel>
        <CrmStatsPanel title="Mensagens">
          <CrmStatsBreakdown
            rows={[
              ["Recebidas", data.messages.inbound],
              ["Enviadas por pessoas", data.messages.humanOutbound],
              ["Enviadas por IA externa", data.messages.externalAiOutbound],
              [
                "Automação interna/sistema",
                data.messages.internalAutomationOutbound,
              ],
              ["Outras saídas", data.messages.otherOutbound],
              ["Total", data.messages.total],
            ]}
          />
          <p className="crm-stats-message-note">
            V2 distingue IA externa pela origem canônica. Automação interna e
            mensagens de sistema permanecem agrupadas; não há sinal canônico
            separado para “minibot”.
          </p>
        </CrmStatsPanel>
        <CrmStatsPanel title="Desempenho da equipe" wide>
          <CrmStatsAgentTable data={data} />
          <p className="crm-stats-attribution">
            Atribuição por responsável atual da conversa; mudanças de
            responsável podem alterar a leitura histórica.
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
  value,
}: {
  icon: typeof MessageCircle;
  label: string;
  note: string;
  value: number | string;
}) {
  return (
    <article className="crm-stats-kpi">
      <span>
        <Icon aria-hidden="true" />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <p>{note}</p>
      </div>
    </article>
  );
}

function CrmStatsPanel({
  children,
  title,
  wide = false,
}: {
  children: ReactNode;
  title: string;
  wide?: boolean;
}) {
  return (
    <article
      className={`crm-stats-panel${wide ? " crm-stats-panel-wide" : ""}`}
    >
      <h3>{title}</h3>
      {children}
    </article>
  );
}

function CrmStatsBreakdown({
  rows,
}: {
  rows: Array<readonly [string, number]>;
}) {
  const max = Math.max(1, ...rows.map((row) => row[1]));
  return rows.length ? (
    <div className="crm-stats-breakdown">
      {rows.map(([label, value]) => (
        <div key={label}>
          <span>
            <strong>{label}</strong>
            <b>{value}</b>
          </span>
          <i>
            <em style={{ width: `${(value / max) * 100}%` }} />
          </i>
        </div>
      ))}
    </div>
  ) : (
    <p className="crm-stats-muted">Sem dados no período.</p>
  );
}

function CrmStatsAgentTable({ data }: { data: CrmStatisticsResponse }) {
  if (!data.agents.length)
    return (
      <p className="crm-stats-muted">
        Nenhum responsável com atividade no período.
      </p>
    );
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
          {data.agents.map((agent) => (
            <tr key={agent.agentId}>
              <td>
                <strong>{agent.name}</strong>
                <small>{agent.role}</small>
              </td>
              <td>{agent.handledConversations}</td>
              <td>{agent.openAssignments}</td>
              <td>{agent.humanOutboundMessages}</td>
              <td>
                {formatCrmStatisticsDuration(agent.averageFirstResponseMs)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
