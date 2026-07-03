import { FileText, Image as ImageIcon } from "lucide-react";

export function InternalPhotosZone({
  internalPhotos,
}: {
  internalPhotos: readonly {
    altText?: string | null;
    filename?: string | null;
    id: string;
    url: string;
  }[];
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {internalPhotos.length > 0 ? (
        internalPhotos.map((photo) => (
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
        ))
      ) : (
        <div className="col-span-full py-10 text-center flex flex-col items-center justify-center bg-panel/30 border border-line border-dashed rounded-xl">
          <ImageIcon className="size-8 text-muted mb-2 animate-none" />
          <p className="text-xs font-bold text-muted">
            Nenhum arquivo interno anexado.
          </p>
        </div>
      )}
    </div>
  );
}
