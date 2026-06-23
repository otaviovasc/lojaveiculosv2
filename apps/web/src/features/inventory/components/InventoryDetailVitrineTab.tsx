import { useState } from "react";
import {
  Globe,
  Copy,
  ExternalLink,
  Pencil,
  Trash2,
  Sparkles,
  Check,
} from "lucide-react";

export function InventoryDetailVitrineTab() {
  const [hasVitrine, setHasVitrine] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [copied, setCopied] = useState(false);

  const publicUrl = "https://loja.lojaveiculosv2.com.br/vitrine/civic-2020";

  const handleCopyLink = () => {
    void navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = () => {
    setHasVitrine(true);
    setIsPublished(true);
  };

  const handleRemove = () => {
    setHasVitrine(false);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto text-app-text">
      {hasVitrine ? (
        <div className="bg-panel border border-line rounded-2xl p-5 flex flex-col gap-6">
          {/* Top Row Controls */}
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4.5 bg-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-accent" />
              </label>
              <span
                className={
                  "text-[10px] font-black px-2.5 py-0.5 rounded-full border " +
                  (isPublished
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/25"
                    : "bg-muted/10 text-muted border-line")
                }
              >
                {isPublished ? "Publicada" : "Rascunho"}
              </span>
            </div>
            <button
              onClick={handleRemove}
              className="text-xs font-black text-danger hover:text-danger-strong flex items-center gap-1 cursor-pointer"
              type="button"
            >
              <Trash2 className="size-3.5" />
              <span>Remover Vitrine</span>
            </button>
          </div>

          {/* URL Block */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted">
              URL pública da Vitrine
            </span>
            <div className="flex items-center justify-between min-h-10 rounded-xl border border-line bg-app/30 px-3.5 font-bold text-xs">
              <span className="text-app-text truncate mr-2 select-all">
                {publicUrl}
              </span>
              <Globe className="size-4 text-muted shrink-0" />
            </div>
          </div>

          {/* Actions Row */}
          <div className="flex flex-wrap gap-2.5 items-center justify-between border-t border-line/45 pt-4 mt-2">
            <div className="flex gap-2">
              <button
                onClick={handleCopyLink}
                className="min-h-9 rounded-lg border border-line px-3.5 text-xs font-black hover:bg-line/25 transition-all text-app-text cursor-pointer flex items-center gap-1.5"
                type="button"
              >
                {copied ? (
                  <Check className="size-3.5 text-emerald-500" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                <span>{copied ? "Copiado!" : "Copiar link"}</span>
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="min-h-9 rounded-lg border border-line px-3.5 text-xs font-black hover:bg-line/25 transition-all text-app-text cursor-pointer flex items-center gap-1.5 decoration-transparent"
              >
                <ExternalLink className="size-3.5" />
                <span>Abrir</span>
              </a>
            </div>
            <button
              className="min-h-9 rounded-lg bg-accent text-inverse font-black text-xs hover:bg-accent-strong transition-all cursor-pointer px-4 flex items-center gap-1.5"
              type="button"
            >
              <Pencil className="size-3.5" />
              <span>Editar Vitrine</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-panel border border-line rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-4 py-16">
          <div className="size-12 rounded-full bg-accent-soft text-accent flex items-center justify-center border border-accent-soft/20 animate-pulse">
            <Sparkles className="size-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-app-text">
              Vitrine Premium
            </h3>
            <p className="text-xs text-muted font-bold max-w-sm mt-1 mx-auto leading-relaxed">
              Crie uma página comercial com design premium e editorial para este
              veículo. Perfeito para compartilhar por WhatsApp e enviar para
              clientes especiais.
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="mt-2 min-h-10 rounded-lg bg-accent text-inverse font-black text-xs hover:bg-accent-strong transition-all cursor-pointer px-6 flex items-center justify-center gap-1.5"
            type="button"
          >
            <Sparkles className="size-4 animate-none" />
            <span>Criar Vitrine</span>
          </button>
        </div>
      )}
    </div>
  );
}
