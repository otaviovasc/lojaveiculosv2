export function validOlxLeadPayload() {
  return {
    createdAt: "2026-08-10T12:00:00.000Z",
    email: "ana@example.com",
    linkAd: "https://www.olx.com.br/vi/123",
    listId: "123",
    message: "Tenho interesse",
    name: "Ana",
    source: "chat",
  };
}

export function fullOlxLeadPayload() {
  return {
    ...validOlxLeadPayload(),
    adsInfo: { body: "not retained", subject: "Honda Civic" },
    buyerHistory: { buyer: { email: "extra@example.com" } },
    externalId: "lead-1",
    phone: "11999999999",
  };
}

export async function readOlxLeadResponse(response: Response) {
  return (await response.json()) as {
    responseId: string;
    status: "accepted" | "duplicate";
  };
}

export function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}
