import { useState } from "react";
import { Plus, Calendar, Video } from "lucide-react";
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
import { CrmDateField } from "./CrmFormControls";
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

export function CrmLeadDetailsTabsReunioes({
  lead,
  activities,
  onCreateActivity,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const meetings = activities.filter((a) => a.activityType === "call");

  const handleCreate = async () => {
    if (!title.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await onCreateActivity(lead.id, {
        activityType: "call",
        content: title.trim(),
        direction: "internal",
        metadata: {
          description: desc.trim(),
          scheduledAt: date ? `${date}T${time || "00:00"}:00` : undefined,
        },
      });
      setIsOpen(false);
      setTitle("");
      setDesc("");
      setDate("");
      setTime("");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 text-app-text select-none">
      <div className="flex items-center justify-between">
        <span className="text-sm font-black text-app-text">Reuniões</span>
        <FeatureActionButton
          icon={Plus}
          label="Agendar reunião"
          onClick={() => setIsOpen(true)}
        >
          Reunião
        </FeatureActionButton>
      </div>

      {meetings.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {meetings.map((m) => (
            <div
              key={m.id}
              className="p-3.5 bg-panel/10 border border-line/15 rounded-xl flex flex-col gap-1.5"
            >
              <span className="text-xs font-black text-app-text">
                {m.content}
              </span>
              {typeof m.metadata?.description === "string" && (
                <p className="text-xs font-bold text-muted leading-relaxed">
                  {m.metadata.description}
                </p>
              )}
              {typeof m.metadata?.scheduledAt === "string" && (
                <span className="text-xs font-bold text-muted flex items-center gap-1 mt-1">
                  <Calendar className="size-3" />
                  <span>
                    Agendada para:{" "}
                    {new Date(m.metadata.scheduledAt).toLocaleString("pt-BR")}
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
              label="Agendar reunião"
              onClick={() => setIsOpen(true)}
              variant="primary"
            />
          }
          body="Nenhuma reunião agendada para este lead ainda."
          density="compact"
          icon={Video}
          title="Sem reuniões"
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
        title="Nova Reunião"
      >
        <div className="grid gap-4">
          <FeatureField label="Assunto">
            <FeatureInput
              disabled={isSaving}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Assunto da reunião"
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
            <FeatureField label="Data">
              <CrmDateField
                disabled={isSaving}
                label="Data"
                onChange={setDate}
                value={date}
              />
            </FeatureField>
            <FeatureField label="Horário">
              <FeatureInput
                disabled={isSaving}
                onChange={(event) => setTime(event.target.value)}
                type="time"
                value={time}
              />
            </FeatureField>
          </FeatureFieldGroup>
        </div>
      </FeatureDialog>
    </div>
  );
}
