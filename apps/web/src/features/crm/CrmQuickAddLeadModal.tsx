import { useState } from "react";
import { ChevronDown, Handshake } from "lucide-react";
import { FeatureInput } from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import {
  FeatureDialog,
  FeatureDialogActions,
} from "../../components/ui/FeatureOverlay";
import { CrmSelect } from "./CrmFormControls";
import type { LeadVehicleOption } from "./CrmPipelineViewTypes";
import type { LeadCreateDraft } from "./crmPipelineModels";
import type { PipelineStage } from "./crmPipelineStorage";
import type { CrmLeadSource } from "./productCrmTypes";
import { CrmFormError, formatCrmSubmitError } from "./CrmFormFeedback";
import { CrmQuickAddLeadMoreOptions } from "./CrmQuickAddLeadMoreOptions";
import { validateQuickLeadInput } from "./crmFormValidation";

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
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const validationError = validateQuickLeadInput({ email, name, phone });
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const metadata = cleanLeadMetadata({
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
        initialPipelineStageId: selectedStageId,
        metadata,
      });
      onClose();
    } catch (caught) {
      setError(
        formatCrmSubmitError(caught, "Não foi possível criar o negócio."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FeatureDialog
      className="max-w-2xl"
      description="Cadastre um novo negócio."
      footer={
        <FeatureDialogActions
          confirmDisabled={isSubmitting}
          confirmIcon={<Handshake aria-hidden="true" className="size-4" />}
          confirmLabel={isSubmitting ? "Criando..." : "Criar"}
          onCancel={onClose}
          onConfirm={() => void handleSubmit()}
        />
      }
      isOpen
      onClose={onClose}
      title="Novo negócio"
    >
      <form
        className="flex flex-col gap-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <div className="flex flex-col gap-3">
          <span className="text-xs font-black uppercase text-muted tracking-wider">
            Cliente
          </span>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FeatureField label="Nome do contato">
              <FeatureInput
                aria-invalid={error === "Informe o nome do contato."}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder="Nome completo"
                required
                type="text"
                value={name}
              />
            </FeatureField>
            <FeatureField label="Telefone">
              <FeatureInput
                onChange={(e) => {
                  setPhone(e.target.value);
                  setError(null);
                }}
                placeholder="(11) 99999-9999"
                type="tel"
                value={phone}
              />
            </FeatureField>
            <FeatureField label="E-mail">
              <FeatureInput
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="email@exemplo.com"
                type="email"
                value={email}
              />
            </FeatureField>
          </div>
        </div>

        <FeatureField label="Veículos de Interesse">
          <CrmSelect
            onChange={setVehicleId}
            options={[
              {
                label: `Adicionar veículo (${vehicleOptions.length} ativos disponíveis)`,
                value: "",
              },
              ...vehicleOptions.map((option) => ({
                label: option.label,
                value: option.id,
              })),
            ]}
            value={vehicleId}
          />
        </FeatureField>

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
        {error ? <CrmFormError>{error}</CrmFormError> : null}
        <button
          aria-hidden="true"
          className="hidden"
          disabled={isSubmitting}
          tabIndex={-1}
          type="submit"
        />
      </form>
    </FeatureDialog>
  );
}

function cleanLeadMetadata(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );
}
