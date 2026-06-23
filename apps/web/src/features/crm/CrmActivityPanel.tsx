import { CalendarPlus, CircleAlert, MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { CustomSelect } from "../../components/ui/CustomSelect";
import { activityTypeLabels, quickTaskOptions } from "./crmPipelineConfig";
import {
  createNoteActivityInput,
  createTaskActivityInput,
  formatLeadName,
  isTaskActivity,
  readTaskMetadata,
} from "./crmPipelineModels";
import type {
  CreateProductCrmActivityInput,
  LeadActivityType,
  ProductCrmLead,
  ProductCrmLeadActivity,
} from "./productCrmTypes";

type ActivityPanelProps = {
  activities: ProductCrmLeadActivity[];
  lead: ProductCrmLead | null;
  onCreateActivity: (
    leadId: string,
    input: CreateProductCrmActivityInput,
  ) => Promise<void>;
};

export function ActivityPanel({
  activities,
  lead,
  onCreateActivity,
}: ActivityPanelProps) {
  const [activityType, setActivityType] = useState<LeadActivityType>("note");
  const [content, setContent] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!lead) return <EmptyPanel title="Atividades aguardando lead" />;

  const submitActivity = async () => {
    if (!content.trim()) return;
    setIsSaving(true);
    try {
      await onCreateActivity(
        lead.id,
        createNoteActivityInput(content.trim(), activityType),
      );
      setContent("");
    } finally {
      setIsSaving(false);
    }
  };

  const submitTask = async (title: string, dueAt: string) => {
    if (!title.trim() || !dueAt) return;
    setIsSaving(true);
    try {
      await onCreateActivity(lead.id, createTaskActivityInput(title, dueAt));
      setTaskTitle("");
      setTaskDueAt("");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="crm-panel">
      <div className="crm-panel-title">
        <MessageCircle aria-hidden="true" className="size-5" />
        <h3>Timeline de {formatLeadName(lead)}</h3>
      </div>
      <div className="crm-activity-input">
        <CustomSelect
          className="crm-input"
          onChange={setActivityType}
          options={(["note", "call", "whatsapp", "email"] as const).map(
            (type) => ({
              label: activityTypeLabels[type],
              value: type,
            }),
          )}
          value={activityType}
        />
        <textarea
          className="crm-input crm-textarea"
          onChange={(event) => setContent(event.target.value)}
          placeholder="Descreva a interacao realizada"
          value={content}
        />
        <button
          className="crm-action"
          disabled={isSaving || !content.trim()}
          onClick={() => void submitActivity()}
          type="button"
        >
          <Send aria-hidden="true" className="size-4" />
          Registrar
        </button>
      </div>
      <div className="crm-task-box">
        <div className="crm-panel-title">
          <CalendarPlus aria-hidden="true" className="size-4" />
          <h3>Nova tarefa</h3>
        </div>
        <input
          className="crm-input"
          onChange={(event) => setTaskTitle(event.target.value)}
          placeholder="Ex: Ligar para proposta"
          value={taskTitle}
        />
        <input
          className="crm-input"
          onChange={(event) => setTaskDueAt(event.target.value)}
          type="datetime-local"
          value={taskDueAt}
        />
        <div className="crm-quick-dates">
          {quickTaskOptions.map((option) => (
            <button
              key={option.label}
              onClick={() =>
                void submitTask(
                  taskTitle || "Retornar contato",
                  toLocalDateInput(option.hoursFromNow),
                )
              }
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
        <button
          className="crm-action crm-action-secondary"
          disabled={isSaving || !taskTitle.trim() || !taskDueAt}
          onClick={() => void submitTask(taskTitle, taskDueAt)}
          type="button"
        >
          <CalendarPlus aria-hidden="true" className="size-4" />
          Agendar tarefa
        </button>
      </div>
      <ActivityTimeline activities={activities} lead={lead} />
    </section>
  );
}

function ActivityTimeline({
  activities,
  lead,
}: {
  activities: ProductCrmLeadActivity[];
  lead: ProductCrmLead;
}) {
  return (
    <div className="crm-timeline">
      <TimelineRow
        label="Lead criado"
        text={formatLeadName(lead)}
        time={lead.createdAt}
        tone="created"
      />
      {activities.map((activity) => (
        <TimelineRow
          key={activity.id}
          label={activityTypeLabels[activity.activityType]}
          text={formatActivityText(activity)}
          time={activity.occurredAt}
          tone={isTaskActivity(activity) ? "task" : "activity"}
        />
      ))}
    </div>
  );
}

function TimelineRow({
  label,
  text,
  time,
  tone,
}: {
  label: string;
  text: string;
  time: string;
  tone: "activity" | "created" | "task";
}) {
  return (
    <article className="crm-timeline-row">
      <span className={`crm-timeline-dot crm-timeline-${tone}`} />
      <div>
        <strong>{label}</strong>
        <p>{text}</p>
        <small>{formatDate(time)}</small>
      </div>
    </article>
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

function formatActivityText(activity: ProductCrmLeadActivity) {
  if (!isTaskActivity(activity)) return activity.content;
  const task = readTaskMetadata(activity);
  return `${task.title ?? activity.content} - ${task.dueAt ? formatDate(task.dueAt) : "sem data"}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function toLocalDateInput(hoursFromNow: number) {
  const date = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return date.toISOString().slice(0, 16);
}
