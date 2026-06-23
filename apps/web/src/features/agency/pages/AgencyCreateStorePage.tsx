import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Store, Globe, ArrowLeft, CheckCircle2 } from "lucide-react";

export function AgencyCreateStorePage() {
  const navigate = useNavigate();
  const [storeName, setStoreName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [plan, setPlan] = useState("START");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNameChange = (val: string) => {
    setStoreName(val);
    // Auto-generate subdomain from store name
    setSubdomain(val.toLowerCase().replace(/[^a-z0-9]/g, ""));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!storeName || !subdomain) return;
    setIsSubmitting(true);
    try {
      // Simulate creation delay
      await new Promise((resolve) => setTimeout(resolve, 1500));
      void navigate("/agency/admin");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[var(--layout-content-max)] flex-col gap-8 px-4 py-8 animate-fade-in">
      <div className="flex items-center gap-4">
        <button
          onClick={() => void navigate("/agency/admin")}
          className="p-2 hover:bg-app-elevated border border-line rounded-xl transition-all text-muted hover:text-primary"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-accent">
            Cadastro
          </span>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary mt-0.5">
            Adicionar Nova Loja
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="agency-card p-8">
            <form
              onSubmit={(event) => void handleSubmit(event)}
              className="space-y-6"
            >
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase text-muted tracking-wider">
                  Nome da Concessionária
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Auto Bahia Veículos"
                  value={storeName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-4 py-3 bg-app border border-line focus:border-accent/40 rounded-xl text-sm font-semibold outline-none transition-all"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase text-muted tracking-wider">
                  Subdomínio de Acesso
                </label>
                <div className="flex items-center bg-app border border-line focus-within:border-accent/40 rounded-xl overflow-hidden px-4 py-3 transition-all">
                  <Globe className="size-4 text-muted shrink-0 mr-2" />
                  <input
                    type="text"
                    required
                    placeholder="autobahia"
                    value={subdomain}
                    onChange={(e) =>
                      setSubdomain(
                        e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""),
                      )
                    }
                    className="bg-transparent border-none text-sm font-semibold outline-none text-primary flex-1"
                  />
                  <span className="text-muted text-xs font-bold font-mono">
                    .lojaveiculos.com.br
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase text-muted tracking-wider">
                  Plano da Loja
                </label>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="w-full px-4 py-3 bg-app border border-line focus:border-accent/40 rounded-xl text-sm font-bold uppercase tracking-wider outline-none cursor-pointer"
                >
                  <option value="START">START - Básico</option>
                  <option value="PREMIUM PRO">
                    PREMIUM PRO - Intermediário
                  </option>
                  <option value="ENTERPRISE">ENTERPRISE - Customizado</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-gradient py-3.5 flex items-center justify-center font-black"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <span>Criar Concessionária</span>
                )}
              </button>
            </form>
          </div>
        </div>

        <div>
          <div className="agency-card p-6 bg-gradient-to-br from-panel to-app-elevated space-y-6">
            <h3 className="text-base font-black uppercase italic tracking-wider text-primary">
              Informações
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="size-4 text-accent shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-muted leading-relaxed">
                  O subdomínio configurado será o link permanente do cliente
                  (ex:{" "}
                  <span className="font-mono font-bold text-primary">
                    autobahia.lojaveiculos.com.br
                  </span>
                  ).
                </p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="size-4 text-accent shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-muted leading-relaxed">
                  A cobrança da nova loja será alocada na fatura de sua conta de
                  agência central de acordo com o plano escolhido.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
