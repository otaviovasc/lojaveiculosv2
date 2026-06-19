import { CircleAlert, MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import type {
  CreateProductCrmActivityInput,
  ProductCrmLead,
  ProductCrmLeadActivity,
} from "./productCrmTypes";

export function ActivityPanel({
  activities,
  lead,
  onCreateActivity,
}: {
  activities: ProductCrmLeadActivity[];
  lead: ProductCrmLead | null;
  onCreateActivity: (
    leadId: string,
    input: CreateProductCrmActivityInput,
  ) => Promise<void>;
}) {
  const [content, setContent] = useState("");
  if (!lead) return <EmptyPanel title="Atividades aguardando lead" />;

  const submit = async () => {
    if (!content.trim()) return;
    await onCreateActivity(lead.id, {
      activityType: "note",
      content: content.trim(),
      direction: "internal",
    });
    setContent("");
  };

  return (
    <section className="crm-panel">
      <div className="crm-panel-title">
        <MessageCircle aria-hidden="true" className="size-5" />
        <h3>Timeline</h3>
      </div>
      <div className="crm-activity-input">
        <textarea
          className="crm-input min-h-24"
          onChange={(event) => setContent(event.target.value)}
          placeholder="Registrar observacao, retorno ou proxima acao"
          value={content}
        />
        <button
          className="crm-action"
          onClick={() => void submit()}
          type="button"
        >
          <Send aria-hidden="true" className="size-4" />
          Registrar
        </button>
      </div>
      <div className="grid gap-2">
        {activities.map((activity) => (
          <article className="crm-activity-row" key={activity.id}>
            <strong>{activity.activityType}</strong>
            <p>{activity.content}</p>
            <span>{formatDate(activity.occurredAt)}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function EmptyPanel({ title }: { title: string }) {
  return (
    <section className="crm-panel crm-empty-panel">
      <CircleAlert aria-hidden="true" className="size-5" />
      <strong>{title}</strong>
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}
