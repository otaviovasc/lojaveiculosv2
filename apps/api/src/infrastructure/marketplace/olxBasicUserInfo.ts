import {
  fetchOlx,
  readBoundedOlxRecord,
} from "./httpMarketplaceProviderGatewayOlxRequest.js";

export async function fetchOlxBasicUserInfo(
  fetchImpl: typeof fetch,
  input: { accessToken: string; baseUrl: string; signal?: AbortSignal },
) {
  const response = await fetchOlx(
    fetchImpl,
    `${input.baseUrl}/oauth_api/basic_user_info`,
    {
      body: JSON.stringify({ access_token: input.accessToken }),
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "User-Agent": "Mozilla/5.0",
      },
      method: "POST",
      ...(input.signal ? { signal: input.signal } : {}),
    },
  );
  const payload = await readBoundedOlxRecord(response);
  return { payload, response };
}
