import { useState } from "react";
import { X, ChevronDown, Handshake } from "lucide-react";
import { FeatureInput } from "../../components/ui/FeatureControls";
import type { LeadVehicleOption } from "./CrmPipelineViewTypes";
import type { LeadCreateDraft } from "./crmPipelineModels";
import type { PipelineStage } from "./crmPipelineStorage";
import type { CrmLeadSource } from "./productCrmTypes";
import { CrmQuickAddLeadMoreOptions } from "./CrmQuickAddLeadMoreOptions";

type Props = {
  stageId: string;
  stages: PipelineStage[];
  onClose: () => void;
  onCreateLead: (draft: LeadCreateDraft) => Promise<void>;
  vehicleOptions: LeadVehicleOption[];
};

export function CrmQuickAddLeadModal({
  stageId,
  stages,
  onClose,
  onCreateLead,
  vehicleOptions,
}: Props) {
  const [selectedStageId, setSelectedStageId] = useState(stageId);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [priority, setPriority] = useState("Média");
  const [urgency, setUrgency] = useState("Média");
  const [preferredContact, setPreferredContact] = useState("WhatsApp");
  const [source, setSource] = useState<CrmLeadSource | "">("");
  const [notes, setNotes] = useState("");
  const [estimatedClosedDate, setEstimatedClosedDate] = useState("");
  const [category, setCategory] = useState("Não definida");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const metadata = cleanLeadMetadata({
        stageId: selectedStageId,
        priority,
        urgency,
        preferredContact,
        notes: notes.trim() || undefined,
        estimatedClosedDate: estimatedClosedDate || undefined,
        category: category !== "Não definida" ? category : undefined,
      });

      await onCreateLead({
        buyerName: name.trim(),
        source: source || "manual",
        ...(phone.trim() ? { buyerPhone: phone.trim() } : {}),
        ...(email.trim() ? { buyerEmail: email.trim() } : {}),
        ...(vehicleId ? { listingId: vehicleId } : {}),
        metadata,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <form
        className="w-full max-w-2xl bg-panel rounded-2xl border border-line shadow-2xl flex flex-col my-8"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <header className="p-4 border-b border-line flex items-center justify-between bg-app-elevated/50">
          <div>
            <h3 className="text-base font-black text-app-text">Novo negócio</h3>
            <p className="text-xs font-bold text-muted mt-0.5">
              Cadastre um novo negócio.
            </p>
          </div>
          <button
            aria-label="Fechar novo negócio"
            className="p-1.5 rounded-lg hover:bg-line/25 text-muted hover:text-app-text cursor-pointer transition-colors"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>

        <div className="p-6 flex flex-col gap-5 overflow-y-auto max-h-[70vh]">
          {/* Cliente Section */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-black uppercase text-muted tracking-wider">
              Cliente
            </span>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-black uppercase text-muted">
                  Nome do contato
                </span>
                <FeatureInput
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome completo"
                  required
                  type="text"
                  value={name}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-black uppercase text-muted">
                  Telefone
                </span>
                <FeatureInput
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  type="tel"
                  value={phone}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-black uppercase text-muted">
                  E-mail
                </span>
                <FeatureInput
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  type="email"
                  value={email}
                />
              </label>
            </div>
          </div>

          {/* Veículos Row */}
          <div className="grid grid-cols-1 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-black uppercase text-muted tracking-wider">
                Veículos de Interesse
              </span>
              <select
                className="min-h-11 rounded-lg border border-line bg-app px-3 text-sm font-bold text-app-text outline-none cursor-pointer"
                onChange={(e) => {
                  const val = e.target.value;
                  setVehicleId(val);
                }}
                value={vehicleId}
              >
                <option value="">
                  Adicionar veículo ({vehicleOptions.length} ativos disponíveis)
                </option>
                {vehicleOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Mais Opções Toggle */}
          <div className="flex flex-col gap-1">
            <button
              aria-expanded={showMore}
              className="flex items-center gap-1 text-xs font-black uppercase text-accent hover:text-accent-strong cursor-pointer w-fit"
              onClick={() => setShowMore(!showMore)}
              type="button"
            >
              <span>Mais opções</span>
              <ChevronDown
                aria-hidden="true"
                className={`size-4 transition-transform ${showMore ? "rotate-180" : ""}`}
              />
            </button>
            {showMore && (
              <CrmQuickAddLeadMoreOptions
                stages={stages}
                selectedStageId={selectedStageId}
                setSelectedStageId={setSelectedStageId}
                notes={notes}
                preferredContact={preferredContact}
                priority={priority}
                setNotes={setNotes}
                setPreferredContact={setPreferredContact}
                setPriority={setPriority}
                setSource={setSource}
                setUrgency={setUrgency}
                source={source}
                urgency={urgency}
                estimatedClosedDate={estimatedClosedDate}
                setEstimatedClosedDate={setEstimatedClosedDate}
                category={category}
                setCategory={setCategory}
              />
            )}
          </div>
        </div>

        <footer className="p-4 border-t border-line bg-app-elevated/50 flex justify-end gap-3 shrink-0">
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-transparent border border-line px-5 text-xs font-black text-app-text hover:bg-line/20 cursor-pointer"
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-accent px-6 text-xs font-black text-inverse cursor-pointer hover:opacity-90 shadow-sm"
            disabled={isSubmitting}
            type="submit"
          >
            <Handshake aria-hidden="true" className="size-4" />
            {isSubmitting ? "Criando..." : "Criar"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function cleanLeadMetadata(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );
}
