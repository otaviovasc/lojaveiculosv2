import type { FinancingProviderGateway } from "../../domains/financing/ports/financingProviderGateway.js";
import {
  bearerHeaders,
  credereApiUrl,
  fetchWithReadRetry,
  parseSafeJson,
  providerError,
} from "./credereHttpSupport.js";
import { mapSimulationCandidates } from "./credereSimulationCandidateMapper.js";

type CandidateInput = Parameters<
  FinancingProviderGateway["listSimulationCandidates"]
>[0];

export async function listCredereSimulationCandidates(
  fetchImpl: typeof fetch,
  input: CandidateInput,
) {
  const response = await fetchWithReadRetry(
    fetchImpl,
    credereApiUrl("/proposal_simulations", {
      after: formatCredereDate(input.createdAfter),
      per_page: "100",
      sort: "created_at_desc",
    }),
    {
      headers: bearerHeaders(input.token.accessToken, input.credereStoreId),
      method: "GET",
    },
  );
  if (!response.ok) throw providerError(response);
  return mapSimulationCandidates(await parseSafeJson(response));
}

function formatCredereDate(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
