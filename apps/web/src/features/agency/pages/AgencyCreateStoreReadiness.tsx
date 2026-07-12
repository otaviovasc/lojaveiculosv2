import { Building2, Check, CircleDashed, Globe2 } from "lucide-react";

export function AgencyCreateStoreReadiness({
  hasName,
  hasSubdomain,
}: {
  hasName: boolean;
  hasSubdomain: boolean;
}) {
  const isReady = hasName && hasSubdomain;

  return (
    <section
      aria-label="Prontidão do cadastro"
      aria-live="polite"
      className="agency-create-readiness"
    >
      <div className="agency-create-readiness__heading">
        <div>
          <span>Prontidão da unidade</span>
          <strong>
            {isReady ? "Cadastro pronto" : "Complete a identidade"}
          </strong>
        </div>
        <span
          className={
            isReady
              ? "agency-create-readiness__score agency-create-readiness__score--ready"
              : "agency-create-readiness__score"
          }
        >
          {isReady ? "3/3" : hasName || hasSubdomain ? "2/3" : "1/3"}
        </span>
      </div>

      <div className="agency-create-readiness__steps">
        <span className="agency-readiness-step agency-readiness-step--connected">
          <Building2 aria-hidden="true" />
          Agência conectada
          <Check aria-hidden="true" />
        </span>
        <span
          className={
            hasName
              ? "agency-readiness-step agency-readiness-step--complete"
              : "agency-readiness-step agency-readiness-step--current"
          }
        >
          {hasName ? (
            <Check aria-hidden="true" />
          ) : (
            <CircleDashed aria-hidden="true" />
          )}
          Nome da loja
        </span>
        <span
          className={
            hasSubdomain
              ? "agency-readiness-step agency-readiness-step--complete"
              : "agency-readiness-step agency-readiness-step--pending"
          }
        >
          {hasSubdomain ? (
            <Check aria-hidden="true" />
          ) : (
            <Globe2 aria-hidden="true" />
          )}
          Endereço público
        </span>
      </div>
    </section>
  );
}
