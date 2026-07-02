import { useState } from "react";
import {
  Sparkles,
  Play,
  Plus,
  ExternalLink,
  HelpCircle,
  Info,
  X,
} from "lucide-react";

interface TagItem {
  id: string;
  label: string;
  checked: boolean;
}

export function InventoryDetailAnuncioTab() {
  const [description, setDescription] = useState<string | null>(null);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [tempDesc, setTempDesc] = useState("");

  const [tags, setTags] = useState<TagItem[]>([
    { id: "unico_dono", label: "Único dono", checked: true },
    { id: "revisado", label: "Revisado", checked: false },
    { id: "ipva_pago", label: "IPVA pago", checked: true },
    { id: "aceita_troca", label: "Aceita troca", checked: false },
    { id: "licenciado", label: "Licenciado", checked: false },
    { id: "garantia", label: "Garantia de fábrica", checked: false },
    { id: "baixa_km", label: "Baixa quilometragem", checked: true },
    { id: "sem_sinistro", label: "Sem sinistro", checked: true },
  ]);

  const [customTags, setCustomTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [anuncioPrice, setAnuncioPrice] = useState("");
  const [videoLink, setVideoLink] = useState("");
  const [portalActive, setPortalActive] = useState(true);
  const [showConfig, setShowConfig] = useState(false);

  const handleToggleTag = (id: string) => {
    setTags((prev) =>
      prev.map((t) => (t.id === id ? { ...t, checked: !t.checked } : t)),
    );
  };

  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    const tag = customTagInput.trim();
    if (tag && !customTags.includes(tag)) {
      setCustomTags((prev) => [...prev, tag]);
      setCustomTagInput("");
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-none text-app-text">
      {/* Card 1: Anúncio */}
      <div className="bg-panel border border-line rounded-2xl p-5 flex flex-col gap-6">
        <h3 className="text-sm font-black uppercase tracking-wider border-b border-line pb-3 flex items-center gap-2">
          <Sparkles className="size-4 text-accent shrink-0 animate-none" />
          <span>Configuração do Anúncio</span>
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-8 flex flex-col gap-5">
            {/* Descrição */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-muted">
                Descrição
              </span>
              {isEditingDesc ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    className="w-full text-xs font-bold text-app-text bg-app border border-line p-3 rounded-xl resize-none outline-none focus:ring-1 focus:ring-accent"
                    rows={4}
                    placeholder="Descreva os destaques comerciais do veículo..."
                    value={tempDesc}
                    onChange={(e) => setTempDesc(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsEditingDesc(false)}
                      className="min-h-8 px-3 rounded-lg border border-line text-xs font-black hover:bg-line/25 transition-all cursor-pointer"
                      type="button"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => {
                        setDescription(tempDesc.trim() || null);
                        setIsEditingDesc(false);
                      }}
                      className="min-h-8 px-4 rounded-lg bg-accent text-inverse text-xs font-black hover:bg-accent-strong transition-all cursor-pointer"
                      type="button"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              ) : description ? (
                <div className="p-3 border border-line bg-app-elevated/40 rounded-xl flex flex-col gap-2">
                  <p className="text-xs font-bold leading-relaxed whitespace-pre-wrap">
                    {description}
                  </p>
                  <button
                    onClick={() => {
                      setTempDesc(description);
                      setIsEditingDesc(true);
                    }}
                    className="self-start text-xs font-black text-accent hover:underline cursor-pointer"
                    type="button"
                  >
                    Editar Descrição
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setTempDesc("");
                    setIsEditingDesc(true);
                  }}
                  className="py-8 border-2 border-dashed border-line hover:border-accent-soft/80 rounded-xl bg-app/20 text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all hover:bg-app/40"
                  type="button"
                >
                  <Plus className="size-4 text-muted animate-pulse" />
                  <span className="text-xs font-black text-app-text">
                    Adicionar Descrição
                  </span>
                </button>
              )}
            </div>

            {/* Tags */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-black uppercase tracking-wider text-muted">
                Tags Recomendadas
              </span>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleToggleTag(tag.id)}
                    className={
                      "text-xs font-black px-2.5 py-1 rounded-full border transition-all cursor-pointer select-none " +
                      (tag.checked
                        ? "bg-accent text-inverse border-accent"
                        : "bg-app-elevated text-muted border-line hover:border-line-strong hover:text-app-text")
                    }
                    type="button"
                  >
                    {tag.label}
                  </button>
                ))}
                {customTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 bg-accent-soft text-accent-strong text-xs font-black px-2.5 py-1 rounded-full border border-accent-soft/20"
                  >
                    <span>{tag}</span>
                    <button
                      onClick={() =>
                        setCustomTags((prev) => prev.filter((t) => t !== tag))
                      }
                      className="hover:text-danger cursor-pointer transition-colors"
                      type="button"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>

              <form
                onSubmit={handleAddCustomTag}
                className="flex gap-2 items-center max-w-xs mt-1.5"
              >
                <input
                  type="text"
                  placeholder="Tag personalizada..."
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  className="min-h-8 flex-1 rounded-lg border border-line bg-app px-2 text-xs font-bold outline-none"
                />
                <button
                  type="submit"
                  className="min-h-8 px-3 bg-accent text-inverse font-black text-xs hover:bg-accent-strong rounded-lg flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <Plus className="size-3.5" />
                </button>
              </form>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden lg:block w-px bg-line self-stretch shrink-0" />

          {/* Listing metadata */}
          <div className="lg:col-span-3 flex flex-col gap-4 justify-between">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-black uppercase tracking-wider text-muted flex items-center gap-1">
                  <span>Valor do anúncio</span>
                  <HelpCircle className="size-3 text-muted" />
                </span>
                <input
                  type="text"
                  placeholder="Sob Consulta"
                  value={anuncioPrice}
                  onChange={(e) => setAnuncioPrice(e.target.value)}
                  className="min-h-9 w-full rounded-lg border border-line bg-app px-2.5 text-xs font-bold outline-none"
                />
                <span className="text-xs font-bold text-muted mt-0.5">
                  Referência venda: R$ 150.000
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-black uppercase tracking-wider text-muted">
                  Link do Vídeo
                </span>
                <div className="relative">
                  <input
                    type="url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={videoLink}
                    onChange={(e) => setVideoLink(e.target.value)}
                    className="min-h-9 w-full rounded-lg border border-line bg-app pl-8 pr-2.5 text-xs font-bold outline-none"
                  />
                  <Play className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="p-3 bg-accent-soft/30 border border-accent-soft/20 rounded-xl flex gap-2 items-start">
              <Info className="size-3.5 text-accent shrink-0 mt-0.5 animate-none" />
              <p className="text-xs text-muted font-bold leading-normal">
                Anúncios completos com fotos, descrição e tags têm melhor
                posicionamento nas buscas dos portais parceiros.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Card 2: Portais */}
      <div className="bg-panel border border-line rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h3 className="text-sm font-black uppercase tracking-wider">
            Portais
          </h3>
          <span className="text-xs font-black text-muted uppercase tracking-wider">
            Veículo: Civic 2.0 EXL 2020 • R$ 150.000
          </span>
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-xl border border-line bg-app/30">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-black text-app-text">
              Portal próprio
            </span>
            <div className="flex items-center gap-1 text-xs font-bold text-accent hover:underline cursor-pointer">
              <span>https://loja.lojaveiculosv2.com.br/veiculo/civic-2020</span>
              <ExternalLink className="size-3" />
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={portalActive}
              onChange={(e) => setPortalActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-8 h-4.5 bg-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-accent" />
          </label>
        </div>

        <div className="py-8 text-center flex flex-col items-center justify-center bg-app/10 border border-line border-dashed rounded-xl gap-2">
          <p className="text-xs font-black text-app-text">
            Nenhum portal parceiro configurado para este veículo.
          </p>
          <p className="text-xs text-muted font-bold">
            Ative integrações com Webmotors, iCarros, OLX nas configurações.
          </p>
          <button
            onClick={() => setShowConfig(true)}
            className="mt-1.5 min-h-8 rounded-lg bg-accent/15 border border-accent/25 text-accent-strong font-black text-xs hover:bg-accent/25 cursor-pointer px-4 flex items-center justify-center"
            type="button"
          >
            Configurar portais
          </button>
        </div>
      </div>

      {showConfig && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-panel border border-line w-full max-w-sm rounded-2xl p-5 shadow-2xl flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-line pb-2">
              <h4 className="text-xs font-black uppercase tracking-wider">
                Integrações de Portais
              </h4>
              <button
                onClick={() => setShowConfig(false)}
                className="text-muted hover:text-app-text cursor-pointer"
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="text-xs font-bold leading-normal text-muted">
              A integração direta com os portais parceiros requer chaves de API
              válidas e permissões comerciais. Contate o administrador.
            </p>
            <button
              onClick={() => setShowConfig(false)}
              className="mt-2 min-h-9 w-full rounded-lg bg-accent text-inverse font-black text-xs hover:bg-accent-strong transition-all cursor-pointer flex items-center justify-center"
              type="button"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
