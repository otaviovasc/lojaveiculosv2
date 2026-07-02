import { useState } from "react";
import { Upload, FileText } from "lucide-react";

export function DocumentosUploadCard() {
  const [docsCount] = useState(0);

  return (
    <div className="bg-panel border border-line rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-black uppercase tracking-wider">
            Documentos
          </h3>
          <span className="bg-accent-soft text-accent-strong text-xs font-black px-2 py-0.5 rounded-full select-none">
            {docsCount}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted font-bold">Máximo 50MB</span>
          <button
            className="min-h-8 rounded-lg bg-accent text-inverse font-black text-xs hover:bg-accent-strong transition-all cursor-pointer px-3.5 flex items-center gap-1.5"
            type="button"
          >
            <Upload className="size-3.5 shrink-0" />
            <span>Upload</span>
          </button>
        </div>
      </div>

      <div className="py-12 text-center flex flex-col items-center justify-center bg-app/10 border border-line border-dashed rounded-xl gap-3">
        <div className="size-10 rounded-full bg-line/25 text-muted flex items-center justify-center">
          <FileText className="size-5" />
        </div>
        <div>
          <p className="text-xs font-black text-app-text">
            Nenhum documento anexado
          </p>
          <p className="text-xs text-muted font-bold mt-1">
            Insira PDFs, comprovantes ou contratos assinados para este veículo.
          </p>
        </div>
        <button
          className="mt-2 min-h-9 rounded-lg bg-accent text-inverse font-black text-xs hover:bg-accent-strong transition-all cursor-pointer px-4 flex items-center justify-center gap-1.5"
          type="button"
        >
          <Upload className="size-3.5" />
          <span>Enviar Documento</span>
        </button>
        <span className="text-xs text-muted/60 font-bold">
          Máximo 50MB por arquivo
        </span>
      </div>
    </div>
  );
}
