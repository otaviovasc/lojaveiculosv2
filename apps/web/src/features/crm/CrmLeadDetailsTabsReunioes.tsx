import { useState } from "react";
import { Plus, X, Calendar, Video } from "lucide-react";
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
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const meetings = activities.filter((a) => a.activityType === "call");

  const handleCreate = async () => {
    if (!title.trim()) return;
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
  };

  return (
    <div className="flex flex-col gap-4 text-app-text select-none">
      <div className="flex items-center justify-between">
        <span className="text-sm font-black text-app-text">Reuniões</span>
        <button
          onClick={() => setIsOpen(true)}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-line bg-panel/10 px-3 text-xs font-bold text-app-text hover:bg-line/15 transition-colors cursor-pointer"
          type="button"
        >
          <Plus className="size-3.5" />
          <span>Reunião</span>
        </button>
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
        <div className="border border-dashed border-line/35 bg-panel/5 rounded-xl p-10 flex flex-col items-center justify-center text-center gap-3">
          <Video className="size-7 text-muted" />
          <span className="text-xs font-bold text-app-text">
            Nenhuma reunião agendada para este lead ainda.
          </span>
          <button
            onClick={() => setIsOpen(true)}
            className="inline-flex h-8 items-center justify-center rounded-lg bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer mt-1"
            type="button"
          >
            Agendar Reunião
          </button>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-panel border border-line/30 rounded-xl w-full max-w-md p-6 flex flex-col gap-5 shadow-2xl relative">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-app-text">Nova Reunião</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted hover:text-app-text transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-black uppercase text-muted">
                  Assunto
                </span>
                <input
                  className="h-10 px-3.5 rounded-lg border border-line/35 bg-app text-xs font-bold text-app-text outline-none focus:border-accent"
                  placeholder="Assunto da reunião"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-black uppercase text-muted">
                  Descrição
                </span>
                <textarea
                  className="min-h-[90px] p-3 rounded-lg border border-line/35 bg-app text-xs font-bold text-app-text outline-none focus:border-accent resize-none"
                  placeholder="Detalhes..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-black uppercase text-muted">
                    Data
                  </span>
                  <input
                    type="date"
                    className="h-10 px-3.5 rounded-lg border border-line/35 bg-app text-xs font-bold text-app-text outline-none focus:border-accent cursor-pointer"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-black uppercase text-muted">
                    Horário
                  </span>
                  <input
                    type="time"
                    className="h-10 px-3.5 rounded-lg border border-line/35 bg-app text-xs font-bold text-app-text outline-none focus:border-accent cursor-pointer"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                onClick={() => setIsOpen(false)}
                className="h-9 px-4 text-xs font-bold text-muted hover:text-app-text border border-line bg-panel/10 rounded-lg transition-colors cursor-pointer"
                type="button"
              >
                Cancelar
              </button>
              <button
                onClick={() => void handleCreate()}
                className="h-9 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
                type="button"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
