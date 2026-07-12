import { BadgeDollarSign, Globe2, Settings2, Sparkles } from "lucide-react";
import { FeatureCard } from "../../../components/ui/FeatureCards";

export function AgencyCreateStoreGuidance() {
  return (
    <FeatureCard className="agency-create-guidance">
      <header className="agency-create-guidance__header">
        <span>Próximos passos</span>
        <h2>Da criação à operação</h2>
        <p>O essencial agora; a ativação completa acontece na sequência.</p>
      </header>

      <ol className="agency-create-guidance__steps">
        <li className="agency-guidance-step agency-guidance-step--accent">
          <span className="agency-guidance-step__icon">
            <Globe2 aria-hidden="true" />
          </span>
          <div>
            <strong>Endereço permanente</strong>
            <p>Escolha um identificador curto e fácil de reconhecer.</p>
          </div>
        </li>
        <li className="agency-guidance-step agency-guidance-step--info">
          <span className="agency-guidance-step__icon">
            <BadgeDollarSign aria-hidden="true" />
          </span>
          <div>
            <strong>Gestão centralizada</strong>
            <p>A agência controla cobrança e recursos da nova unidade.</p>
          </div>
        </li>
        <li className="agency-guidance-step agency-guidance-step--success">
          <span className="agency-guidance-step__icon">
            <Settings2 aria-hidden="true" />
          </span>
          <div>
            <strong>Ativação assistida</strong>
            <p>Depois, complete fiscal, equipe e vitrine nas configurações.</p>
          </div>
        </li>
      </ol>

      <div className="agency-create-guidance__footer">
        <Sparkles aria-hidden="true" />
        <p>
          <strong>Cadastro enxuto.</strong> Nenhum plano ou cobrança é ativado
          sem uma decisão posterior.
        </p>
      </div>
    </FeatureCard>
  );
}
