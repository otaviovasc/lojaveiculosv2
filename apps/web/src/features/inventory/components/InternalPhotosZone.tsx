import { FileText, Image as ImageIcon, Plus, UploadCloud } from "lucide-react";

export function InternalPhotosZone({
  internalPhotos,
  onUploadInternal,
}: {
  internalPhotos: readonly {
    altText?: string | null;
    filename?: string | null;
    id: string;
    url: string;
  }[];
  onUploadInternal?: (file: File) => void;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {internalPhotos.length > 0 ? (
        <>
          {internalPhotos.map((photo) => (
            <div
              key={photo.id}
              className="flex flex-col gap-2 p-3 bg-panel border border-line rounded-xl hover:border-line-strong transition-all"
            >
              <div className="aspect-[4/3] rounded-lg bg-app border border-line/60 flex items-center justify-center overflow-hidden relative group">
                {photo.url ? (
                  <img
                    src={photo.url}
                    alt={photo.filename || photo.altText || "Arquivo Interno"}
                    className="size-full object-cover animate-none"
                  />
                ) : (
                  <FileText className="size-8 text-muted" />
                )}
              </div>
              <span className="text-xs font-bold text-app-text truncate">
                {photo.filename || photo.altText || "Registro interno"}
              </span>
            </div>
          ))}
          <label className="flex flex-col items-center justify-center gap-2 p-3 bg-panel/30 border border-line border-dashed rounded-xl hover:border-accent-strong/40 hover:bg-accent-soft/10 transition-all cursor-pointer min-h-[120px] select-none text-center">
            <Plus className="size-6 text-muted" />
            <span className="text-xs font-black text-muted">Adicionar</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadInternal?.(file);
                e.target.value = "";
              }}
            />
          </label>
        </>
      ) : (
        <div className="col-span-full py-10 text-center flex flex-col items-center justify-center bg-panel/30 border border-line border-dashed rounded-xl">
          <ImageIcon className="size-8 text-muted mb-2 animate-none" />
          <p className="text-xs font-bold text-muted">
            Nenhum arquivo interno anexado.
          </p>
          <label className="mt-3 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-accent-soft px-4 text-xs font-black text-accent-strong hover:bg-accent-soft/85 cursor-pointer border border-accent-soft/20 shadow-sm">
            <UploadCloud className="size-4" />
            <span>Adicionar registro interno</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadInternal?.(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      )}
    </div>
  );
}
