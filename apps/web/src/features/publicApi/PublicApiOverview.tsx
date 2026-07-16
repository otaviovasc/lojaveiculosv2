import { ArrowRight, Braces, KeyRound, ShieldCheck } from "lucide-react";
import { publicApiBasePath } from "./publicApiCatalog";

export function PublicApiOverview() {
  return (
    <section className="public-api-overview" aria-label="Fluxo da Public API">
      <div className="public-api-overview__journey">
        <div className="public-api-overview__heading">
          <span>Da chave à primeira chamada</span>
          <h2>Um fluxo curto, com segurança visível.</h2>
        </div>
        <ol>
          <li>
            <span>01</span>
            <div>
              <strong>Escolha o perfil</strong>
              <small>Comece com permissões adequadas ao caso de uso.</small>
            </div>
            <ArrowRight aria-hidden="true" className="size-4" />
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>Revise os escopos</strong>
              <small>Libere leitura e escrita de forma independente.</small>
            </div>
            <ArrowRight aria-hidden="true" className="size-4" />
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>Copie e conecte</strong>
              <small>A chave completa aparece somente na criação.</small>
            </div>
          </li>
        </ol>
      </div>
      <aside className="public-api-overview__contract">
        <span>
          <Braces aria-hidden="true" className="size-4" />
          Contrato operacional
        </span>
        <code>{publicApiBasePath}</code>
        <p>
          Mutações exigem <strong>Idempotency-Key</strong> e entram na trilha de
          auditoria.
        </p>
        <small>
          <KeyRound aria-hidden="true" className="size-3.5" />
          Chaves <code>lv2_...</code> por cliente e loja
        </small>
        <small>
          <ShieldCheck aria-hidden="true" className="size-3.5" />
          DTOs externos sem dados internos
        </small>
      </aside>
    </section>
  );
}
