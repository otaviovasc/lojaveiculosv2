import { useState } from "react";
import {
  Upload,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Move,
  Image as ImageIcon,
} from "lucide-react";
import type { InventoryMedia } from "../model/types";

export function InventoryPhotosWorkspace({
  photos,
  onMove,
  onDelete,
  onUpload,
}: {
  photos: readonly InventoryMedia[];
  onMove: (dragIndex: number, hoverIndex: number) => void;
  onDelete: (id: string) => void;
  onUpload: () => void;
}) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    onMove(draggedIndex, targetIndex);
    setDraggedIndex(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-panel border border-line rounded-2xl p-5">
        <h3 className="text-sm font-black text-app-text uppercase tracking-wider border-b border-line pb-3 mb-4">
          Galeria de Fotos (Arraste para Reordenar)
        </h3>

        {photos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {photos.map((photo, idx) => (
              <div
                key={photo.id}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                className={
                  "relative aspect-[16/10] overflow-hidden rounded-xl bg-app border group transition-all select-none " +
                  (idx === 0
                    ? "border-accent shadow-md"
                    : "border-line hover:border-line-strong")
                }
              >
                <img
                  src={photo.url}
                  alt={"Photo " + (idx + 1)}
                  className="size-full object-cover pointer-events-none"
                />

                <div className="absolute top-2 left-2 flex items-center gap-1.5">
                  {idx === 0 ? (
                    <span className="bg-accent text-inverse text-[9px] font-black uppercase px-2 py-0.5 rounded shadow">
                      Capa
                    </span>
                  ) : (
                    <span className="bg-panel/90 backdrop-blur-sm text-app-text text-[9px] font-bold px-2 py-0.5 rounded shadow flex items-center gap-1">
                      <Move className="size-2.5 text-muted" />
                      {"#" + (idx + 1)}
                    </span>
                  )}
                </div>

                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => onDelete(photo.id)}
                      className="p-1.5 rounded-lg bg-panel/90 hover:bg-danger hover:text-inverse text-danger transition-all cursor-pointer shadow"
                      title="Excluir Foto"
                      type="button"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <div className="flex justify-center gap-2 pb-2">
                    <button
                      disabled={idx === 0}
                      onClick={() => onMove(idx, idx - 1)}
                      className="p-1 bg-panel/90 text-app-text rounded border border-line/40 disabled:opacity-50 hover:bg-accent-soft hover:text-accent-strong cursor-pointer"
                      title="Mover para trás"
                      type="button"
                    >
                      <ArrowLeft className="size-3.5" />
                    </button>
                    <button
                      disabled={idx === photos.length - 1}
                      onClick={() => onMove(idx, idx + 1)}
                      className="p-1 bg-panel/90 text-app-text rounded border border-line/40 disabled:opacity-50 hover:bg-accent-soft hover:text-accent-strong cursor-pointer"
                      title="Mover para frente"
                      type="button"
                    >
                      <ArrowRight className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center flex flex-col items-center justify-center bg-app/20 border border-line border-dashed rounded-xl">
            <ImageIcon className="size-8 text-muted mb-2" />
            <p className="text-xs font-bold text-muted">
              Nenhuma foto pública cadastrada.
            </p>
          </div>
        )}
      </div>

      <div className="relative flex py-2 items-center">
        <div className="flex-grow border-t border-line/60"></div>
        <span className="flex-shrink mx-4 text-xs font-black text-muted uppercase tracking-widest bg-app px-3">
          Upload de Arquivos
        </span>
        <div className="flex-grow border-t border-line/60"></div>
      </div>

      <div
        onClick={onUpload}
        className="border-2 border-dashed border-line hover:border-accent-soft/80 rounded-2xl bg-panel/30 p-6 flex flex-col items-center justify-center text-center gap-3 cursor-pointer min-h-[160px] transition-all hover:bg-panel/50"
      >
        <div className="size-10 rounded-full bg-accent-soft flex items-center justify-center text-accent-strong border border-accent-soft/20 animate-pulse">
          <Upload className="size-5" />
        </div>
        <div>
          <p className="text-xs font-black text-app-text">
            Arraste ou clique para enviar novas fotos públicas
          </p>
          <p className="text-[10px] text-muted font-bold mt-1">
            Formatos suportados: JPG, PNG. Recomendado 1920x1080.
          </p>
        </div>
      </div>
    </div>
  );
}
