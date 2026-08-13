export async function fetchOlxBasicUserInfo(
  fetchImpl: typeof fetch,
  input: { accessToken: string; baseUrl: string; signal?: AbortSignal },
) {
  const response = await fetchImpl(
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
  const payload = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  return { payload, response };
}
