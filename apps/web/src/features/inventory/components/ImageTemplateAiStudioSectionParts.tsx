import { CheckCircle2, Image as ImageIcon, XCircle } from "lucide-react";
import { cx } from "../../../components/ui/featureShared";
import type { ImageTemplateMedia } from "./ImageTemplateTypes";
import type { AiStudioGenerationQuota } from "./useAiStudioGenerationQuota";

export type AiStudioStatus =
  | { kind: "downloaded" }
  | { kind: "downloading" }
  | { kind: "error"; message: string }
  | { kind: "generating" }
  | { kind: "idle" };

export type IndexedImageTemplateMedia = ImageTemplateMedia & { index: number };

export function QuotaCard({ quota }: { quota: AiStudioGenerationQuota }) {
  const percentUsed = Math.min((quota.used / quota.limit) * 100, 100);

  return (
    <section className="rounded-xl border border-line bg-panel p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-muted">
            Conta PRO
          </p>
          <p className="mt-1 text-sm font-black text-app-text">
            {quota.used}/{quota.limit} gerações usadas
          </p>
        </div>
        <span className="rounded-full border border-accent-soft bg-accent-soft px-3 py-1 text-xs font-black text-accent-strong">
          {quota.remaining} restantes
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-app-elevated">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${percentUsed}%` }}
        />
      </div>
      <p className="mt-2 text-[11px] font-bold text-muted">
        Limite mensal do plano PRO em {quota.periodLabel}.
      </p>
    </section>
  );
}

export function SelectedPhotoCard({
  photos,
  selectedPhoto,
  setSelectedPhotoIndex,
}: {
  photos: readonly IndexedImageTemplateMedia[];
  selectedPhoto: IndexedImageTemplateMedia | undefined;
  setSelectedPhotoIndex: (index: number) => void;
}) {
  if (!selectedPhoto) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-app p-4 text-center">
        <ImageIcon
          aria-hidden="true"
          className="mx-auto mb-2 size-7 text-muted"
        />
        <p className="text-sm font-black text-app-text">
          Nenhuma foto disponível
        </p>
        <p className="mt-1 text-xs font-bold text-muted">
          Adicione uma foto na galeria do veículo antes de usar IA.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-line bg-app p-3">
      <p className="mb-2 text-xs font-black uppercase tracking-wider text-muted">
        Foto base
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {photos.map((photo) => (
          <button
            aria-label="Selecionar foto base para IA"
            className={cx(
              "h-16 w-20 shrink-0 overflow-hidden rounded-lg border transition-all",
              selectedPhoto.id === photo.id
                ? "border-accent shadow-[var(--shadow-focus)]"
                : "border-line opacity-70 hover:opacity-100",
            )}
            key={photo.id}
            onClick={() => setSelectedPhotoIndex(photo.index)}
            type="button"
          >
            <img
              alt={photo.altText ?? "Foto do veiculo"}
              className="size-full object-cover"
              src={photo.url}
            />
          </button>
        ))}
      </div>
    </section>
  );
}

export function StatusMessage({
  exhausted,
  status,
}: {
  exhausted: boolean;
  status: AiStudioStatus;
}) {
  if (exhausted) {
    return (
      <p className="flex items-center gap-2 text-xs font-bold text-danger">
        <XCircle aria-hidden="true" className="size-4" />
        Limite mensal de gerações atingido.
      </p>
    );
  }
  if (status.kind === "error") {
    return (
      <p className="flex items-center gap-2 text-xs font-bold text-danger">
        <XCircle aria-hidden="true" className="size-4" />
        {status.message}
      </p>
    );
  }
  if (status.kind === "downloaded") {
    return (
      <p className="flex items-center gap-2 text-xs font-bold text-success">
        <CheckCircle2 aria-hidden="true" className="size-4" />
        Download iniciado. Anexe o arquivo à galeria quando quiser publicar.
      </p>
    );
  }
  return (
    <p className="text-xs font-bold text-muted">
      Cada clique em melhorar foto consome 1 geração mensal.
    </p>
  );
}
