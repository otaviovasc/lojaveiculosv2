import { Camera, Check, LoaderCircle, AlertCircle } from "lucide-react";
import type { InventoryFormState } from "../model/formModel";
import type { CreateMediaDraft } from "../model/createMediaDrafts";
import type { CreateFlowSubmitState } from "./InventoryCreateFlow";
import { parsePriceCents } from "../model/formModel";
import { inventoryStatusLabels } from "../model/listCatalogModel";
import type { InventoryResaleAnalysisResponse } from "../model/enrichmentTypes";
import { AnalysisPanel, type Loadable } from "./InventoryCreateEnrichmentParts";

interface InventoryCreateSidebarProps {
  form: InventoryFormState;
  media: readonly CreateMediaDraft[];
  stores: Array<{ id: string; name: string; slug: string }>;
  submitState: CreateFlowSubmitState;
  onRetryMedia: () => void;
  isSubmitting: boolean;
  analysisState: Loadable<InventoryResaleAnalysisResponse>;
  canAnalyze: boolean;
  onGenerateAnalysis: () => void;
}

export function InventoryCreateSidebar({
  form,
  media,
  stores,
  submitState,
  onRetryMedia,
  isSubmitting,
  analysisState,
  canAnalyze,
  onGenerateAnalysis,
}: InventoryCreateSidebarProps) {
  const selectedStore = stores.find((s) => s.id === form.storeId);

  const hasStore = Boolean(form.storeId);
  const hasCatalog = Boolean(form.catalog);
  const hasAcquisitionPrice = Boolean(
    form.acquisitionPrice && parsePriceCents(form.acquisitionPrice),
  );
  const hasPrice = Boolean(form.price && parsePriceCents(form.price));

  const checklist = [
    { label: "Loja", completed: hasStore },
    { label: "Marca e modelo", completed: hasCatalog },
    { label: "Valor de aquisição", completed: hasAcquisitionPrice },
    { label: "Valor de venda", completed: hasPrice },
  ];

  const completedCount = checklist.filter((item) => item.completed).length;
  const progressPercentage = (completedCount / checklist.length) * 100;

  const formatCurrency = (val: string) => {
    const cents = parsePriceCents(val);
    if (!cents) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const previewPhoto = media[0]?.previewUrl || null;

  return (
    <aside className="custom-scrollbar xl:sticky xl:top-6 flex flex-col self-start w-full max-h-[calc(100dvh-3rem)] overflow-y-auto pr-1">
      <div className="glass-panel-branded overflow-hidden rounded-2xl border border-line bg-panel shadow-[var(--shadow-panel)] flex flex-col divide-y divide-line/60">
        {/* Preview Content */}
        <PreviewCardContent
          previewPhoto={previewPhoto}
          selectedStoreName={selectedStore?.name ?? null}
          statusLabel={inventoryStatusLabels[form.status]}
          title={form.title}
          plate={form.plate}
          acquisitionPrice={formatCurrency(form.acquisitionPrice)}
          sellPrice={formatCurrency(form.price)}
        />

        {/* Progress Content */}
        <div className="p-5 flex flex-col gap-5 bg-panel">
          <ProgressCardContent
            checklist={checklist}
            completedCount={completedCount}
            isSubmitting={isSubmitting}
            onRetryMedia={onRetryMedia}
            progressPercentage={progressPercentage}
            submitState={submitState}
          />
        </div>

        {/* Analysis Content */}
        <div className="p-5 flex flex-col gap-4 bg-panel">
          <AnalysisPanel
            canAnalyze={canAnalyze}
            onGenerate={onGenerateAnalysis}
            state={analysisState}
          />
        </div>
      </div>
    </aside>
  );
}

function PreviewCardContent({
  previewPhoto,
  selectedStoreName,
  statusLabel,
  title,
  plate,
  acquisitionPrice,
  sellPrice,
}: {
  previewPhoto: string | null;
  selectedStoreName: string | null;
  statusLabel: string;
  title: string;
  plate: string;
  acquisitionPrice: string;
  sellPrice: string;
}) {
  return (
    <>
      <div className="relative aspect-video w-full bg-app-elevated flex items-center justify-center border-b border-line/60">
        {previewPhoto ? (
          <img
            src={previewPhoto}
            alt="Preview do Veículo"
            className="h-full w-full object-cover animate-fade-in"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted">
            <Camera className="size-8 stroke-[1.5]" />
            <span className="text-xs font-bold">Sem fotos cadastradas</span>
          </div>
        )}
        <span className="absolute top-3 left-3 bg-accent-soft text-accent-strong text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-accent-soft/20 backdrop-blur-sm">
          {statusLabel}
        </span>
      </div>

      <div className="p-5 flex flex-col gap-4">
        <div className="space-y-1">
          <h4 className="text-base font-black text-app-text break-words">
            {title.trim() || "Novo Veículo"}
          </h4>
          <p className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-muted">
            <span>{selectedStoreName ?? "Nenhuma loja selecionada"}</span>
            {plate ? (
              <>
                <span className="text-line-strong">•</span>
                <span className="font-mono bg-app-elevated text-xs px-1.5 py-0.5 rounded border border-line">
                  {plate.toUpperCase()}
                </span>
              </>
            ) : null}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-line/60 pt-4 text-xs">
          <div>
            <span className="block text-xs font-black text-muted uppercase tracking-wider">
              Valor de aquisição
            </span>
            <span className="font-bold text-app-text">{acquisitionPrice}</span>
          </div>
          <div>
            <span className="block text-xs font-black text-muted uppercase tracking-wider">
              Valor de Venda
            </span>
            <span className="font-bold text-accent-strong text-sm">
              {sellPrice}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

function ProgressCardContent({
  checklist,
  completedCount,
  isSubmitting,
  onRetryMedia,
  progressPercentage,
  submitState,
}: {
  checklist: ReadonlyArray<{ label: string; completed: boolean }>;
  completedCount: number;
  isSubmitting: boolean;
  onRetryMedia: () => void;
  progressPercentage: number;
  submitState: CreateFlowSubmitState;
}) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-line pb-4">
        <div className="space-y-1">
          <h4 className="text-sm font-black uppercase tracking-wider">
            Progresso do Cadastro
          </h4>
          <p className="text-xs font-bold text-muted">
            Preencha os campos obrigatórios
          </p>
        </div>
        <span className="text-lg font-black text-accent-strong">
          {completedCount}/{checklist.length}
        </span>
      </div>

      <div className="w-full bg-app-elevated h-2.5 rounded-full overflow-hidden border border-line/50">
        <div
          className="bg-accent h-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      <ul className="flex flex-col gap-3 my-2">
        {checklist.map((item, idx) => (
          <li
            key={idx}
            className="flex items-center justify-between text-xs font-bold text-app-text"
          >
            <span
              className={
                item.completed ? "text-muted line-through" : "text-app-text"
              }
            >
              {item.label}
            </span>
            <span
              className={
                item.completed
                  ? "size-5 rounded-full border flex items-center justify-center transition-colors bg-accent-soft border-accent-strong text-accent-strong"
                  : "size-5 rounded-full border flex items-center justify-center transition-colors border-line bg-app-elevated text-transparent"
              }
            >
              <Check className="size-3 stroke-[3]" />
            </span>
          </li>
        ))}
      </ul>

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent hover:bg-accent-strong hover:text-accent-strong-foreground text-accent-foreground font-black text-sm transition-all disabled:opacity-75 cursor-pointer"
      >
        {isSubmitting ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Check className="size-4" />
        )}
        <span>Salvar Veículo</span>
      </button>

      <SubmitStatusPanel
        submitState={submitState}
        onRetryMedia={onRetryMedia}
      />
    </>
  );
}

function SubmitStatusPanel({
  submitState,
  onRetryMedia,
}: {
  submitState: CreateFlowSubmitState;
  onRetryMedia: () => void;
}) {
  if (submitState.kind === "error") {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/10 p-3.5 text-xs text-danger font-bold animate-shake">
        <AlertCircle className="size-4 shrink-0" />
        <p>{submitState.message}</p>
      </div>
    );
  }

  if (submitState.kind === "success") {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-accent/30 bg-accent-soft p-3.5 text-xs text-accent-strong font-bold animate-fade-in">
        <Check className="size-4 shrink-0" />
        <p>Veículo cadastrado com sucesso.</p>
      </div>
    );
  }

  if (submitState.kind === "partial") {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3.5 text-xs font-bold text-app-text animate-fade-in">
        <div className="flex items-start gap-2 text-warning">
          <AlertCircle className="size-4 shrink-0" />
          <p>{submitState.message}</p>
        </div>
        <button
          type="button"
          onClick={onRetryMedia}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-accent-soft px-3 text-xs font-black text-accent-soft-foreground hover:bg-accent-soft/80"
        >
          Reenviar midias pendentes
        </button>
      </div>
    );
  }

  return null;
}
