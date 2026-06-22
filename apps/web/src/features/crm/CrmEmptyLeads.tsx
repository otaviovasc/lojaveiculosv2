import { Inbox } from "lucide-react";

export function EmptyLeads() {
  return (
    <section className="crm-panel crm-empty-panel">
      <Inbox aria-hidden="true" className="size-5" />
      <strong>Nenhum lead encontrado</strong>
      <span>Ajuste os filtros ou crie um lead manual.</span>
    </section>
  );
}
