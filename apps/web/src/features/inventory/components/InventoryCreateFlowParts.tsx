import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  LoaderCircle,
} from "lucide-react";
import type { CreateMediaDraft } from "../model/createMediaDrafts";
import type { InventoryFormState } from "../model/formModel";
import type { InventoryListingStatus } from "../model/types";
import { InventoryBadge, InventoryPanel } from "./InventoryFormParts";
import type {
  CreateFlowMode,
  CreateFlowSubmitState,
} from "./InventoryCreateFlow";

export const createFlowSteps = [
  "Modo",
  "Catalogo",
  "Midia",
  "Dados",
  "Revisao",
] as const;

export function CreateStepper({ step }: { step: number }) {
  return (
    <ol className="flex gap-2 overflow-x-auto rounded-lg border border-line bg-panel p-2">
      {createFlowSteps.map((label, index) => (
        <li
          className={[
            "flex min-w-max items-center gap-2 rounded-md px-3 py-2",
            index <= step ? "bg-accent-soft text-accent-strong" : "text-muted",
          ].join(" ")}
          key={label}
        >
          <span className="grid size-6 place-items-center rounded-full bg-panel text-xs font-black">
            {index < step ? <CheckCircle2 className="size-3" /> : index + 1}
          </span>
          <span className="text-xs font-black">{label}</span>
        </li>
      ))}
    </ol>
  );
}

export function ModePanel({
  mode,
  onChange,
}: {
  mode: CreateFlowMode;
  onChange: (mode: CreateFlowMode) => void;
}) {
  return (
    <InventoryPanel icon={<ClipboardList className="size-5" />} title="Modo">
      <div className="grid gap-3 md:grid-cols-3">
        <ModeButton active={mode === "quick"} onClick={() => onChange("quick")}>
          Rapido
        </ModeButton>
        <ModeButton
          active={mode === "detailed"}
          onClick={() => onChange("detailed")}
        >
          Detalhado
        </ModeButton>
        <ModeButton active={mode === "draft"} onClick={() => onChange("draft")}>
          Rascunho
        </ModeButton>
      </div>
    </InventoryPanel>
  );
}

export function CreateSubmitPanel({
  media,
  onRetryMedia,
  state,
  status,
}: {
  media: readonly CreateMediaDraft[];
  onRetryMedia: () => void;
  state: CreateFlowSubmitState;
  status: InventoryListingStatus;
}) {
  const submitLocked = state.kind === "submitting" || state.kind === "partial";

  return (
    <section className="rounded-lg border border-line bg-panel p-4 shadow-[var(--shadow-panel)]">
      <div className="mb-4 flex flex-wrap gap-2">
        <InventoryBadge>
          {status === "draft" ? "rascunho" : "publicacao"}
        </InventoryBadge>
        <InventoryBadge tone="blue">{media.length} midias</InventoryBadge>
      </div>
      <button
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-black text-inverse disabled:opacity-70"
        disabled={submitLocked}
        type="submit"
      >
        {state.kind === "submitting" ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <CheckCircle2 className="size-4" />
        )}
        {submitButtonLabel(state)}
      </button>
      <SubmitStatus onRetryMedia={onRetryMedia} state={state} />
    </section>
  );
}

export function CreateNavigation({
  canAdvance,
  isFirst,
  isLast,
  onBack,
  onNext,
  submitting,
}: {
  canAdvance: boolean;
  isFirst: boolean;
  isLast: boolean;
  onBack: () => void;
  onNext: () => void;
  submitting: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <button
        className="flex min-h-11 items-center gap-2 rounded-lg border border-line bg-panel px-4 text-sm font-black text-app-text disabled:opacity-50"
        disabled={isFirst || submitting}
        onClick={onBack}
        type="button"
      >
        <ArrowLeft className="size-4" />
        Voltar
      </button>
      {!isLast ? (
        <button
          className="flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-black text-inverse disabled:opacity-50"
          disabled={!canAdvance || submitting}
          onClick={onNext}
          type="button"
        >
          Avancar
          <ArrowRight className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

export function canAdvanceStep(
  step: (typeof createFlowSteps)[number],
  form: InventoryFormState,
  mode: CreateFlowMode,
) {
  if (mode === "draft") return true;
  if (step === "Catalogo") return Boolean(form.title.trim());
  return true;
}

function ModeButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      className={[
        "min-h-14 rounded-lg border border-line px-4 text-sm font-black",
        active ? "bg-accent text-inverse" : "bg-app text-app-text",
      ].join(" ")}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function SubmitStatus({
  onRetryMedia,
  state,
}: {
  onRetryMedia: () => void;
  state: CreateFlowSubmitState;
}) {
  if (state.kind === "error") {
    return (
      <p className="mt-3 text-sm font-black text-danger">{state.message}</p>
    );
  }
  if (state.kind === "success") {
    return (
      <p className="mt-3 text-sm font-black text-accent-strong">
        Estoque criado: {state.listingId} · {state.mediaCount} midias.
      </p>
    );
  }
  if (state.kind === "partial") {
    return (
      <div className="mt-3 grid gap-3 rounded-lg border border-line bg-app p-3">
        <p className="text-sm font-black text-danger">{state.message}</p>
        <p className="text-xs font-bold text-muted">
          Registro salvo: {state.listingId}. Reenvie apenas as{" "}
          {state.failedMediaIds.length} midias pendentes para evitar duplicar o
          estoque.
        </p>
        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-accent-soft px-4 text-sm font-black text-accent-strong"
          onClick={onRetryMedia}
          type="button"
        >
          <ArrowRight className="size-4" />
          Reenviar midias pendentes
        </button>
      </div>
    );
  }
  return null;
}

function submitButtonLabel(state: CreateFlowSubmitState) {
  if (state.kind === "submitting") return state.label;
  if (state.kind === "partial") return "Estoque salvo";
  return "Salvar veiculo";
}
