import { useState } from "react";
import { Plus, Calendar, ClipboardList } from "lucide-react";
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
        <span className="text-sm font-black text-app-text">Tarefas</span>
        <FeatureActionButton
          icon={Plus}
          label="Criar tarefa"
          onClick={() => setIsOpen(true)}
        >
          Tarefa
        </FeatureActionButton>
      </div>

      {tasks.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="p-3.5 bg-panel/10 border border-line/15 rounded-xl flex flex-col gap-1.5"
            >
              <div className="flex justify-between items-start gap-4">
                <span className="text-xs font-black text-app-text">
                  {task.content}
                </span>
                {typeof task.metadata?.priority === "string" && (
                  <span className="px-2 py-0.5 rounded text-xs font-black uppercase bg-line/25 text-muted">
                    {task.metadata.priority}
                  </span>
                )}
              </div>
              {typeof task.metadata?.description === "string" && (
                <p className="text-xs font-bold text-muted leading-relaxed">
                  {task.metadata.description}
                </p>
              )}
              {typeof task.metadata?.dueAt === "string" && (
                <span className="text-xs font-bold text-muted flex items-center gap-1 mt-1">
                  <Calendar className="size-3" />
                  <span>
                    Vence em:{" "}
                    {new Date(task.metadata.dueAt).toLocaleString("pt-BR")}
                  </span>
                </span>
              )}
            </div>
          ))}
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
          body="Nenhuma tarefa criada para este lead ainda."
          density="compact"
          icon={ClipboardList}
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
              placeholder="Detalhes..."
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
