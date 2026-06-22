export type BrazilianZipCodeAddress = {
  city: string;
  state: string;
};

export async function fetchBrazilianZipCodeAddress(
  zipCode: string,
  fetchImpl: typeof fetch = fetch,
): Promise<BrazilianZipCodeAddress | null> {
  const digits = zipCode.replace(/\D/g, "");
  if (digits.length !== 8) return null;

  const response = await fetchImpl(
    `https://brasilapi.com.br/api/cep/v1/${digits}`,
  );
  if (!response.ok) {
    throw new Error("CEP nao encontrado");
  }

  const data = (await response.json()) as {
    city?: unknown;
    state?: unknown;
  };
  if (typeof data.city !== "string" || typeof data.state !== "string") {
    throw new Error("Resposta de CEP invalida");
  }

  return {
    city: data.city,
    state: data.state,
  };
}
