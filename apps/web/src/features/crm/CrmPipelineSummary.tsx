type CrmPipelineSummaryProps = {
  activeClients: number;
  newClients30Days: number;
  totalClients: number;
};

export function CrmPipelineSummary({
  activeClients,
  newClients30Days,
  totalClients,
}: CrmPipelineSummaryProps) {
  return (
    <section className="crm-client-summary-grid">
      <SummaryTile label="Total de clientes" value={totalClients} />
      <SummaryTile label="Clientes ativos" value={activeClients} />
      <SummaryTile label="Novos em 30 dias" value={newClients30Days} />
    </section>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <article className="crm-client-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
