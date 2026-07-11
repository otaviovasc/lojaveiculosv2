import { useState } from "react";
import { Plus, X, Calendar, ClipboardList } from "lucide-react";
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
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState("Média");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const tasks = activities.filter((a) => a.activityType === "task");

  const handleCreate = async () => {
    if (!title.trim()) return;
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
  };

  return (
    <div className="flex flex-col gap-4 text-app-text select-none">
      <div className="flex items-center justify-between">
        <span className="text-sm font-black text-app-text">Tarefas</span>
        <button
          onClick={() => setIsOpen(true)}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-line bg-panel/10 px-3 text-xs font-bold text-app-text hover:bg-line/15 transition-colors cursor-pointer"
          type="button"
        >
          <Plus className="size-3.5" />
          <span>Tarefa</span>
        </button>
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
        <div className="border border-dashed border-line/35 bg-panel/5 rounded-xl p-10 flex flex-col items-center justify-center text-center gap-3">
          <ClipboardList className="size-7 text-muted" />
          <span className="text-xs font-bold text-app-text">
            Nenhuma tarefa criada para este lead ainda.
          </span>
          <button
            onClick={() => setIsOpen(true)}
            className="inline-flex h-8 items-center justify-center rounded-lg bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer mt-1"
            type="button"
          >
            Criar Tarefa
          </button>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-panel border border-line/30 rounded-xl w-full max-w-md p-6 flex flex-col gap-5 shadow-2xl relative">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-app-text">Nova Tarefa</h3>
              <button
                aria-label="Fechar nova tarefa"
                onClick={() => setIsOpen(false)}
                className="text-muted hover:text-app-text transition-colors"
                type="button"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-black uppercase text-muted">
                  Título
                </span>
                <input
                  className="h-10 px-3.5 rounded-lg border border-line/35 bg-app text-xs font-bold text-app-text outline-none focus:border-accent"
                  placeholder="O que precisa ser feito?"
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
                    Prioridade
                  </span>
                  <CrmSelect
                    className="h-10 px-3.5 text-xs"
                    onChange={setPriority}
                    options={crmPriorityOptions}
                    value={priority}
                  />
                </label>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-black uppercase text-muted">
                    Vencimento
                  </span>
                  <CrmDateField
                    label="Vencimento"
                    onChange={setDate}
                    value={date}
                  />
                </div>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-black uppercase text-muted">
                  Horário (opcional)
                </span>
                <input
                  type="time"
                  className="h-10 px-3.5 rounded-lg border border-line/35 bg-app text-xs font-bold text-app-text outline-none focus:border-accent cursor-pointer"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </label>
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
