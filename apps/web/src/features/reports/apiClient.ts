import { readApiJson } from "../../lib/apiErrors";
import type { ReportsAuth, ReportsDashboard, ReportsPeriod } from "./types";

export type ReportsApi = {
  downloadExecutiveReport: (
    period: ReportsPeriod,
  ) => Promise<{ blob: Blob; fileName: string }>;
  getDashboard: (period: ReportsPeriod) => Promise<ReportsDashboard>;
};

export type CreateReportsApiOptions = {
  auth?: ReportsAuth;
  baseUrl?: string;
  fetch: typeof fetch;
};

export function createReportsApi({
  auth = {},
  baseUrl,
  fetch,
}: CreateReportsApiOptions): ReportsApi {
  return {
    downloadExecutiveReport: async (period) => {
      const response = await fetch(
        createEndpoint(
          `/analytics/dashboard.pdf?from=${period.from}&to=${period.to}`,
          baseUrl,
        ),
        { headers: createHeaders(auth) },
      );
      if (!response.ok) await readJson<never>(response);
      return {
        blob: await response.blob(),
        fileName:
          response.headers
            .get("content-disposition")
            ?.match(/filename="?([^";]+)"?/i)?.[1] ??
          `relatorio-executivo-${period.from}-a-${period.to}.pdf`,
      };
    },
    getDashboard: (period) =>
      fetch(
        createEndpoint(
          `/analytics/dashboard?from=${period.from}&to=${period.to}`,
          baseUrl,
        ),
        {
          headers: createHeaders(auth),
        },
      ).then(readJson<ReportsDashboard>),
  };
}

function createHeaders(auth: ReportsAuth): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (auth.accessToken) headers.Authorization = `Bearer ${auth.accessToken}`;
  if (auth.clerkUserId) headers["x-clerk-user-id"] = auth.clerkUserId;
  if (auth.storeSlug) headers["x-store-slug"] = auth.storeSlug;
  return headers;
}

function createEndpoint(path: string, baseUrl = "/api/v1") {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

async function readJson<T>(response: Response): Promise<T> {
  return readApiJson<T>(response, { feature: "Relatorios" });
}
