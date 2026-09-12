import { useState } from "react";
import { Plus, Calendar, Clock, Video } from "lucide-react";
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
        <div className="flex items-center gap-2">
          <Video className="size-4 text-primary" />
          <span className="text-sm font-black text-app-text">
            Reuniões & Visitas ({meetings.length})
          </span>
        </div>
        <FeatureActionButton
          icon={Plus}
          label="Agendar reunião"
          onClick={() => setIsOpen(true)}
        >
          Nova Reunião
        </FeatureActionButton>
      </div>

      {meetings.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {meetings.map((m) => {
            const schedStr =
              typeof m.metadata?.scheduledAt === "string"
                ? m.metadata.scheduledAt
                : null;
            const schedDate = schedStr ? new Date(schedStr) : null;

            return (
              <div
                key={m.id}
                className="p-4 bg-panel/20 border border-line/20 rounded-xl flex items-start gap-4 hover:border-line/40 transition-colors"
              >
                {schedDate ? (
                  <div className="flex flex-col items-center justify-center size-12 rounded-xl bg-panel/60 border border-line/30 shrink-0 text-center">
                    <span className="text-xs font-black uppercase text-primary leading-none">
                      {schedDate.toLocaleString("pt-BR", { month: "short" })}
                    </span>
                    <span className="text-base font-black text-app-text leading-tight">
                      {schedDate.getDate()}
                    </span>
                  </div>
                ) : (
                  <div className="grid size-12 place-items-center rounded-xl bg-panel/60 border border-line/30 shrink-0 text-muted">
                    <Calendar className="size-5" />
                  </div>
                )}

                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex justify-between items-start gap-2">
                    <strong className="text-sm font-black text-app-text">
                      {m.content}
                    </strong>
                    <span className="px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                      Agendada
                    </span>
                  </div>

                  {typeof m.metadata?.description === "string" &&
                  m.metadata.description ? (
                    <p className="text-xs font-medium text-muted leading-relaxed">
                      {m.metadata.description}
                    </p>
                  ) : null}

                  {schedDate ? (
                    <span className="text-xs font-bold text-muted flex items-center gap-1 mt-1">
                      <Clock className="size-3 text-muted/70" />
                      <span>
                        Horário:{" "}
                        {schedDate.toLocaleString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
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
          body="Nenhuma reunião ou visita agendada para este lead ainda. Registre compromissos presenciais ou online."
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
              placeholder="Ex.: Test drive do Corolla / Visita na loja"
              value={title}
            />
          </FeatureField>
          <FeatureField label="Descrição">
            <FeatureTextarea
              disabled={isSaving}
              onChange={(event) => setDesc(event.target.value)}
              placeholder="Pauta ou detalhes da reunião..."
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
