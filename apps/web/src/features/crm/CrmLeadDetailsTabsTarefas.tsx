import { useState } from "react";
import { Plus, Calendar, CheckSquare } from "lucide-react";
import {
  FeatureInput,
  FeatureTextarea,
} from "../../components/ui/FeatureControls";
import {
  FeatureField,
  FeatureFieldGroup,
} from "../../components/ui/FeatureForms";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import {
  FeatureDialog,
  FeatureDialogActions,
} from "../../components/ui/FeatureOverlay";
import { FeatureEmptyState } from "../../components/ui/FeatureStates";
import { CrmDateField, CrmSelect } from "./CrmFormControls";
import { crmPriorityOptions } from "./crmLeadData";
import type {
  CreateProductCrmActivityInput,
  ProductCrmLead,
  ProductCrmLeadActivity,
} from "./productCrmTypes";

type Props = {
  lead: ProductCrmLead;
  activities: ProductCrmLeadActivity[];
  onCreateActivity: (
    leadId: string,
    input: CreateProductCrmActivityInput,
  ) => Promise<void>;
};

export function CrmLeadDetailsTabsTarefas({
  lead,
  activities,
  onCreateActivity,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState("Média");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const tasks = activities.filter((a) => a.activityType === "task");

  const handleCreate = async () => {
    if (!title.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await onCreateActivity(lead.id, {
        activityType: "task",
        content: title.trim(),
        direction: "internal",
        metadata: {
          description: desc.trim(),
          priority,
          dueAt: date ? `${date}T${time || "00:00"}:00` : undefined,
        },
      });
      setIsOpen(false);
      setTitle("");
      setDesc("");
      setPriority("Média");
      setDate("");
      setTime("");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 text-app-text select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="size-4 text-primary" />
          <span className="text-sm font-black text-app-text">
            Tarefas ({tasks.length})
          </span>
        </div>
        <FeatureActionButton
          icon={Plus}
          label="Criar tarefa"
          onClick={() => setIsOpen(true)}
        >
          Nova Tarefa
        </FeatureActionButton>
      </div>

      {tasks.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {tasks.map((task) => {
            const priorityVal =
              typeof task.metadata?.priority === "string"
                ? task.metadata.priority
                : "Média";
            const dueAtStr =
              typeof task.metadata?.dueAt === "string"
                ? task.metadata.dueAt
                : null;
            const dueDate = dueAtStr ? new Date(dueAtStr) : null;
            const isOverdue = dueDate ? dueDate.getTime() < Date.now() : false;

            return (
              <div
                key={task.id}
                className="p-4 bg-panel/20 border border-line/20 rounded-xl flex flex-col gap-2 hover:border-line/40 transition-colors"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="grid size-5 place-items-center rounded bg-blue-500/15 text-blue-500 shrink-0 mt-0.5">
                      <CheckSquare className="size-3" />
                    </span>
                    <strong className="text-sm font-black text-app-text leading-snug break-words">
                      {task.content}
                    </strong>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider shrink-0 border ${getPriorityBadgeClass(
                      priorityVal,
                    )}`}
                  >
                    {priorityVal}
                  </span>
                </div>

                {typeof task.metadata?.description === "string" &&
                task.metadata.description ? (
                  <p className="text-xs font-medium text-muted leading-relaxed pl-7">
                    {task.metadata.description}
                  </p>
                ) : null}

                {dueDate ? (
                  <div className="flex items-center justify-between pt-1 border-t border-line/10 pl-7 text-xs font-bold">
                    <span className="text-muted flex items-center gap-1.5">
                      <Calendar className="size-3 text-muted/70" />
                      <span>
                        Vencimento:{" "}
                        {dueDate.toLocaleString("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </span>
                    {isOverdue ? (
                      <span className="text-danger font-black text-xs uppercase">
                        Atrasada
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <FeatureEmptyState
          action={
            <FeatureActionButton
              icon={Plus}
              label="Criar tarefa"
              onClick={() => setIsOpen(true)}
              variant="primary"
            />
          }
          body="Nenhuma tarefa pendente para este lead. Adicione prazos e lembretes para manter o atendimento em dia."
          density="compact"
          icon={CheckSquare}
          title="Sem tarefas"
        />
      )}

      <FeatureDialog
        footer={
          <FeatureDialogActions
            confirmDisabled={!title.trim()}
            confirmLabel="Criar"
            isLoading={isSaving}
            loadingLabel="Criando"
            onCancel={() => !isSaving && setIsOpen(false)}
            onConfirm={() => void handleCreate()}
          />
        }
        isOpen={isOpen}
        onClose={() => !isSaving && setIsOpen(false)}
        title="Nova Tarefa"
      >
        <div className="grid gap-4">
          <FeatureField label="Título">
            <FeatureInput
              disabled={isSaving}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="O que precisa ser feito?"
              value={title}
            />
          </FeatureField>
          <FeatureField label="Descrição">
            <FeatureTextarea
              disabled={isSaving}
              onChange={(event) => setDesc(event.target.value)}
              placeholder="Detalhes ou orientações..."
              value={desc}
            />
          </FeatureField>
          <FeatureFieldGroup>
            <FeatureField label="Prioridade">
              <CrmSelect
                disabled={isSaving}
                onChange={setPriority}
                options={crmPriorityOptions}
                value={priority}
              />
            </FeatureField>
            <FeatureField label="Vencimento">
              <CrmDateField
                disabled={isSaving}
                label="Vencimento"
                onChange={setDate}
                value={date}
              />
            </FeatureField>
          </FeatureFieldGroup>
          <FeatureField label="Horário (opcional)">
            <FeatureInput
              disabled={isSaving}
              onChange={(event) => setTime(event.target.value)}
              type="time"
              value={time}
            />
          </FeatureField>
        </div>
      </FeatureDialog>
    </div>
  );
}

function getPriorityBadgeClass(priority: string) {
  switch (priority.toLowerCase()) {
    case "alta":
    case "urgente":
      return "border-danger/30 bg-danger/10 text-danger";
    case "baixa":
      return "border-line/30 bg-line/15 text-muted";
    default:
      return "border-warning/30 bg-warning/10 text-warning-strong";
  }
}
