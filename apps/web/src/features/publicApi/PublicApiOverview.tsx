import { Bot, Braces, KeyRound, ShieldCheck } from "lucide-react";
import { publicApiBasePath } from "./publicApiCatalog";

export function PublicApiOverview() {
  return (
    <section className="public-api-overview" aria-label="Resumo da Public API">
      <article>
        <span>
          <KeyRound aria-hidden="true" className="size-4" />
        </span>
        <strong>x-api-key + Bearer</strong>
        <small>
          Chaves <code>lv2_...</code> por cliente, escopo e loja atual.
        </small>
      </article>
      <article>
        <span>
          <ShieldCheck aria-hidden="true" className="size-4" />
        </span>
        <strong>Idempotente</strong>
        <small>
          Mutacoes exigem <code>Idempotency-Key</code> e entram no audit trail.
        </small>
      </article>
      <article>
        <span>
          <Bot aria-hidden="true" className="size-4" />
        </span>
        <strong>AI native</strong>
        <small>Manifest, llms.txt, OpenAPI e tool definitions.</small>
      </article>
      <article>
        <span>
          <Braces aria-hidden="true" className="size-4" />
        </span>
        <strong>{publicApiBasePath}</strong>
        <small>DTOs externos seguros para veiculos e leads.</small>
      </article>
    </section>
  );
}
