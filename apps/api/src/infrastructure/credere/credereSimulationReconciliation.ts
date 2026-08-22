import type { FinancingProviderGateway } from "../../domains/financing/ports/financingProviderGateway.js";
import {
  bearerHeaders,
  credereApiUrl,
  fetchWithReadRetry,
  parseSafeJson,
  providerError,
} from "./credereHttpSupport.js";
import { createHash } from "node:crypto";
import {
  mapSimulationCandidates,
  simulationCandidateRowCount,
} from "./credereSimulationCandidateMapper.js";

type CandidateInput = Parameters<
  FinancingProviderGateway["listSimulationCandidates"]
>[0];

export async function listCredereSimulationCandidates(
  fetchImpl: typeof fetch,
  input: CandidateInput,
  apiRoot?: string,
) {
  const candidates = [];
  const seenCandidates = new Set<string>();
  const seenPages = new Set<string>();
  for (let page = 1; ; page += 1) {
    const result = await readCandidatePage(fetchImpl, input, page, apiRoot);
    const fingerprint = pageFingerprint(result.payload);
    if (seenPages.has(fingerprint)) break;
    seenPages.add(fingerprint);
    for (const candidate of result.candidates) {
      if (seenCandidates.has(candidate.uuid)) continue;
      seenCandidates.add(candidate.uuid);
      candidates.push(candidate);
    }
    if (result.rowCount < pageSize) break;
  }
  return candidates;
}

const pageSize = 100;

async function readCandidatePage(
  fetchImpl: typeof fetch,
  input: CandidateInput,
  page: number,
  apiRoot?: string,
) {
  const response = await fetchWithReadRetry(
    fetchImpl,
    credereApiUrl(
      "/proposal_simulations",
      {
        after: formatCredereDate(input.createdAfter),
        page: String(page),
        per_page: String(pageSize),
        sort: "created_at_desc",
      },
      apiRoot,
    ),
    {
      headers: bearerHeaders(input.token.accessToken, input.credereStoreId),
      method: "GET",
    },
  );
  if (!response.ok) throw providerError(response);
  const payload = await parseSafeJson(response);
  return {
    candidates: mapSimulationCandidates(payload),
    payload,
    rowCount: simulationCandidateRowCount(payload),
  };
}

function pageFingerprint(payload: Record<string, unknown>) {
  const rows = payload.data ?? payload.simulations ?? null;
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
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
