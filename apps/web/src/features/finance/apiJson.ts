export type JsonBody = Record<string, unknown>;

export async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Finance request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function readUpload(response: Response): Promise<void> {
  if (!response.ok) {
    throw new Error(
      `Finance document upload failed with status ${response.status}`,
    );
  }
}

export function cleanJson(body: JsonBody) {
  return Object.fromEntries(
    Object.entries(body).filter(([, value]) => value !== undefined),
  );
}
