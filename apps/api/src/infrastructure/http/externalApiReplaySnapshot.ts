const MAX_EXTERNAL_API_REPLAY_BYTES = 256 * 1024;

export class ExternalApiReplaySnapshotError extends Error {}

export async function readExternalApiReplaySnapshot(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new ExternalApiReplaySnapshotError(
      "External API replay only supports JSON responses.",
    );
  }

  const text = await response.clone().text();
  if (
    new TextEncoder().encode(text).byteLength > MAX_EXTERNAL_API_REPLAY_BYTES
  ) {
    throw new ExternalApiReplaySnapshotError(
      "External API replay response exceeds 256 KiB.",
    );
  }

  return {
    body: JSON.parse(text) as unknown,
    contentType: contentType.slice(0, 100),
  };
}
