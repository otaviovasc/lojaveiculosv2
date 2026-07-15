import { useState, type ReactNode } from "react";
import {
  CarFront,
  ChevronDown,
  Handshake,
  LoaderCircle,
  Mail,
  Phone,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import { FeatureInput } from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import {
  FeatureDialog,
  FeatureDialogActions,
} from "../../components/ui/FeatureOverlay";
import { formatBrazilianPhone } from "../../lib/masks";
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
      description={
        "Registre o contato, o veículo de interesse e os próximos passos comerciais."
      }
      footer={
        <FeatureDialogActions
          confirmDisabled={isSubmitting}
          confirmIcon={
            isSubmitting ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin"
              />
            ) : (
              <Handshake aria-hidden="true" className="size-4" />
            )
          }
          confirmLabel="Criar negócio"
          isLoading={isSubmitting}
          loadingLabel="Criando negócio"
          onCancel={onClose}
          onConfirm={() => void handleSubmit()}
        />
      }
      icon={<Handshake aria-hidden="true" />}
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
          <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted">
            <UserRound aria-hidden="true" className="size-4 text-accent" />
            Dados do cliente
          </span>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FeatureField
              label={
                <FieldLabel icon={<UserRound />} label="Nome do contato" />
              }
            >
              <FeatureInput
                aria-invalid={error === "Informe o nome do contato."}
                autoComplete="name"
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
            <FeatureField
              label={<FieldLabel icon={<Phone />} label="Telefone" />}
            >
              <FeatureInput
                aria-invalid={error === "Informe um telefone válido com DDD."}
                autoComplete="tel"
                inputMode="tel"
                onChange={(e) => {
                  setPhone(formatBrazilianPhone(e.target.value));
                  setError(null);
                }}
                placeholder="(11) 99999-9999"
                type="tel"
                value={phone}
              />
            </FeatureField>
            <FeatureField label={<FieldLabel icon={<Mail />} label="E-mail" />}>
              <FeatureInput
                aria-invalid={error === "Informe um e-mail válido."}
                autoCapitalize="none"
                autoComplete="email"
                onBlur={() => setEmail((value) => value.trim().toLowerCase())}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="email@exemplo.com"
                spellCheck={false}
                type="email"
                value={email}
              />
            </FeatureField>
          </div>
        </div>

        <FeatureField
          label={
            <FieldLabel icon={<CarFront />} label="Veículo de interesse" />
          }
        >
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
            className="flex min-h-9 w-fit cursor-pointer items-center gap-2 rounded-lg px-2 text-xs font-black uppercase text-accent transition-colors hover:bg-accent-soft hover:text-accent-strong"
            onClick={() => setShowMore(!showMore)}
            type="button"
          >
            <SlidersHorizontal aria-hidden="true" className="size-4" />
            <span>Mais opções</span>
            <ChevronDown
              aria-hidden="true"
              className={`size-4 transition-transform ${showMore ? "rotate-180" : ""}`}
            />
          </button>
          {showMore ? (
            <div className="crm-quick-add-options">
              <CrmQuickAddLeadMoreOptions
                category={category}
                estimatedClosedDate={estimatedClosedDate}
                notes={notes}
                preferredContact={preferredContact}
                priority={priority}
                selectedStageId={selectedStageId}
                setCategory={setCategory}
                setEstimatedClosedDate={setEstimatedClosedDate}
                setNotes={setNotes}
                setPreferredContact={setPreferredContact}
                setPriority={setPriority}
                setSelectedStageId={setSelectedStageId}
                setSource={setSource}
                setUrgency={setUrgency}
                source={source}
                stages={stages}
                urgency={urgency}
              />
            </div>
          ) : null}
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

function FieldLabel({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden="true" className="text-muted [&>svg]:size-3.5">
        {icon}
      </span>
      {label}
    </span>
  );
}

function cleanLeadMetadata(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );
}
