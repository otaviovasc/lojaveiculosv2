import { ArrowLeft, Building2, Globe2, Rocket } from "lucide-react";

export function AgencyCreateStoreIntro({ onBack }: { onBack: () => void }) {
  return (
    <header className="agency-create-intro" data-agency-reveal>
      <div className="agency-create-intro__content">
        <button className="agency-create-back" onClick={onBack} type="button">
          <ArrowLeft aria-hidden="true" />
          <span>Rede de lojas</span>
        </button>

        <div className="agency-create-intro__copy">
          <p className="agency-create-kicker">
            <span aria-hidden="true" />
            Implantação de unidade
          </p>
          <h1 id="agency-create-title">Nova concessionária</h1>
          <p>
            Defina a identidade pública da loja. Cobrança, equipe e operação
            entram na sequência.
          </p>
        </div>

        <ol aria-label="Etapas da implantação" className="agency-create-flow">
          <li className="agency-create-flow__step agency-create-flow__step--accent">
            <Building2 aria-hidden="true" />
            <span>Identidade</span>
          </li>
          <li className="agency-create-flow__step agency-create-flow__step--info">
            <Globe2 aria-hidden="true" />
            <span>Presença digital</span>
          </li>
          <li className="agency-create-flow__step agency-create-flow__step--success">
            <Rocket aria-hidden="true" />
            <span>Ativação</span>
          </li>
        </ol>
      </div>

      <div aria-hidden="true" className="agency-create-intro__art">
        <span className="agency-create-intro__art-label">Nova unidade</span>
        <img
          className="agency-create-intro__watermark"
          src="/icons/lv-logo-outline-light.svg"
        />
        <span className="agency-create-intro__art-caption">
          Rede pronta para crescer
        </span>
      </div>
    </header>
  );
}
