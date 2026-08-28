import { expect } from "vitest";

export async function readSseUntil(response: Response, expected: string) {
  const reader = response.body?.getReader();
  expect(reader).toBeDefined();
  const decoder = new TextDecoder();
  let text = "";
  for (let attempt = 0; attempt < 4 && !text.includes(expected); attempt += 1) {
    const chunk = await readChunk(reader!);
    if (chunk.done) break;
    text += decoder.decode(chunk.value);
  }
  await reader!.cancel();
  return text;
}

async function readChunk(reader: ReadableStreamDefaultReader<Uint8Array>) {
  return Promise.race([
    reader.read(),
    new Promise<ReadableStreamReadResult<Uint8Array>>((_, reject) => {
      setTimeout(() => reject(new Error("Timed out reading SSE.")), 1_000);
    }),
  ]);
}
