import {
  CircleCheck,
  Info,
  Loader2,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import type { CredereApplicantPreflightState } from "./types";

export function SimulationApplicantPreflightStatus({
  canCheck,
  invalid = false,
  onRetry,
  requestId = null,
  state,
  blockingFields,
}: {
  blockingFields: readonly string[];
  canCheck: boolean;
  invalid?: boolean;
  onRetry: () => void;
  requestId?: string | null;
  state: CredereApplicantPreflightState;
}) {
  const text =
    state.kind === "loading"
      ? "Conferindo os dados exigidos pelos bancos..."
      : state.kind === "error"
        ? state.message
        : state.kind === "ready"
          ? blockingFields.length
            ? `A consulta exige campo(s) ainda indisponível(is) neste formulário: ${blockingFields.join(", ")}. Remova o banco que exige esses dados ou tente novamente mais tarde.`
            : state.result.missingFields.length
              ? `Dados mínimos conferidos para iniciar a simulação. ${state.result.missingFields.length} dado(s) adicional(is) solicitado(s) pelos bancos.`
              : state.result.applicantKnown
                ? "Cadastro localizado e campos vazios preenchidos. Nenhum dado adicional foi solicitado."
                : "Dados mínimos conferidos para iniciar a simulação."
          : canCheck
            ? "Confira os campos exigidos antes de enviar a simulação."
            : "Informe um CPF/CNPJ válido para conferir os campos exigidos.";
  const tone =
    state.kind === "ready" && blockingFields.length ? "blocked" : state.kind;
  const Icon =
    state.kind === "loading"
      ? Loader2
      : state.kind === "error"
        ? TriangleAlert
        : state.kind === "ready" && blockingFields.length === 0
          ? CircleCheck
          : Info;
  return (
    <div
      className={`credere-form-preflight credere-form-preflight--${tone} ${invalid ? "credere-form-preflight--invalid" : ""}`}
      data-invalid={invalid || undefined}
      role={
        state.kind === "error" || invalid || blockingFields.length
          ? "alert"
          : "status"
      }
    >
      <span aria-hidden="true" className="credere-form-preflight-icon">
        <Icon />
      </span>
      <p className="credere-form-preflight-text">
        {text}
        {state.kind === "error" && requestId ? (
          <span className="credere-form-preflight-error-id">
            ID do erro: {requestId}
          </span>
        ) : null}
      </p>
      {state.kind !== "loading" ? (
        <button
          className="credere-form-preflight-action"
          disabled={!canCheck}
          onClick={onRetry}
          type="button"
        >
          <RefreshCw aria-hidden="true" />
          {state.kind === "ready" ? "Conferir novamente" : "Conferir agora"}
        </button>
      ) : null}
    </div>
  );
}
