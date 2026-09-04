import type {
  FiscalEconomicActivity,
  FiscalIssuerProfileInput,
  SetupFiscalConnectionInput,
} from "./types";

/**
 * Form-level representation of the issuer profile. All values are strings
 * so controlled inputs stay simple; `buildSetupInput` converts them into the
 * API contract accepted by `POST /fiscal/connection/setup`.
 */
export type IssuerProfileDraft = {
  additionalInformation: string;
  cityCode: string;
  cityName: string;
  cityState: string;
  cityTaxNumber: string;
  district: string;
  email: string;
  federalTaxNumber: string;
  legalName: string;
  mainActivityCode: string;
  name: string;
  number: string;
  phone: string;
  postalCode: string;
  secondaryActivityCodes: string;
  simplesNacionalTaxRegime: string;
  specialTaxRegime: string;
  stateTaxNumber: string;
  street: string;
  taxRegime: string;
};

export type IssuerProfileErrors = Partial<
  Record<keyof IssuerProfileDraft, string>
>;

export function createEmptyIssuerProfileDraft(): IssuerProfileDraft {
  return {
    additionalInformation: "",
    cityCode: "",
    cityName: "",
    cityState: "",
    cityTaxNumber: "",
    district: "",
    email: "",
    federalTaxNumber: "",
    legalName: "",
    mainActivityCode: "",
    name: "",
    number: "",
    phone: "",
    postalCode: "",
    secondaryActivityCodes: "",
    simplesNacionalTaxRegime: "",
    specialTaxRegime: "",
    stateTaxNumber: "",
    street: "",
    taxRegime: "",
  };
}

/**
 * Prefills the form from the profile returned by the provider. The provider
 * payload is loosely typed, so every field is read defensively and anything
 * unexpected falls back to an empty field instead of breaking the form.
 */
export function readIssuerProfileDraft(
  profile: Record<string, unknown>,
): IssuerProfileDraft {
  const address = readRecord(profile.address);
  const city = readRecord(address?.city);
  const activities = Array.isArray(profile.economicActivities)
    ? profile.economicActivities
    : [];
  const codes = activities
    .map((activity) => readRecord(activity))
    .filter((activity): activity is Record<string, unknown> =>
      Boolean(activity),
    );

  return {
    ...createEmptyIssuerProfileDraft(),
    additionalInformation: readText(address?.additionalInformation),
    cityCode: city?.code ? String(city.code) : "",
    cityName: readText(city?.name),
    cityState: readText(city?.state),
    cityTaxNumber: readText(profile.cityTaxNumber),
    district: readText(address?.district),
    email: readText(profile.email),
    federalTaxNumber: readText(profile.federalTaxNumber),
    legalName: readText(profile.legalName),
    mainActivityCode: readText(
      codes.find((activity) => activity.type === "main")?.code,
    ),
    name: readText(profile.name),
    number: readText(address?.number),
    phone: readText(profile.phone),
    postalCode: readText(address?.postalCode),
    secondaryActivityCodes: codes
      .filter((activity) => activity.type === "secondary")
      .map((activity) => readText(activity.code))
      .filter(Boolean)
      .join(", "),
    simplesNacionalTaxRegime: readText(profile.simplesNacionalTaxRegime),
    specialTaxRegime: readText(profile.specialTaxRegime),
    stateTaxNumber: readText(profile.stateTaxNumber),
    street: readText(address?.street),
    taxRegime: readText(profile.taxRegime),
  };
}

export function validateIssuerProfileDraft(
  draft: IssuerProfileDraft,
): IssuerProfileErrors {
  const errors: IssuerProfileErrors = {};
  const cnpjDigits = digitsOnly(draft.federalTaxNumber);
  if (cnpjDigits.length !== 14) {
    errors.federalTaxNumber = "Informe um CNPJ válido com 14 dígitos.";
  }
  if (draft.name.trim().length < 2) {
    errors.name = "Informe o nome fantasia da loja.";
  }
  if (draft.legalName.trim().length < 2) {
    errors.legalName = "Informe a razão social da loja.";
  }
  if (draft.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) {
    errors.email = "Informe um e-mail válido ou deixe em branco.";
  }
  if (!draft.street.trim()) errors.street = "Informe o logradouro.";
  if (!draft.number.trim()) errors.number = "Informe o número.";
  if (!draft.district.trim()) errors.district = "Informe o bairro.";
  const postalDigits = digitsOnly(draft.postalCode);
  if (postalDigits.length !== 8) {
    errors.postalCode = "Informe um CEP com 8 dígitos.";
  }
  if (draft.cityName.trim().length < 2) {
    errors.cityName = "Informe o nome do município.";
  }
  if (draft.cityState.trim().length !== 2) {
    errors.cityState = "Informe a UF com 2 letras.";
  }
  const cityCode = Number.parseInt(draft.cityCode.trim(), 10);
  if (!Number.isInteger(cityCode) || cityCode <= 0) {
    errors.cityCode = "Informe o código IBGE do município.";
  }
  const mainCode = digitsOnly(draft.mainActivityCode);
  if (draft.mainActivityCode.trim() && mainCode.length < 4) {
    errors.mainActivityCode = "Informe um CNAE válido ou deixe em branco.";
  }
  return errors;
}

export function hasIssuerProfileErrors(errors: IssuerProfileErrors) {
  return Object.values(errors).some(Boolean);
}

export function buildSetupInput(
  draft: IssuerProfileDraft,
): SetupFiscalConnectionInput {
  const issuerProfile: FiscalIssuerProfileInput = {
    address: {
      ...(draft.additionalInformation.trim()
        ? { additionalInformation: draft.additionalInformation.trim() }
        : {}),
      city: {
        code: Number.parseInt(draft.cityCode.trim(), 10),
        name: draft.cityName.trim(),
        state: draft.cityState.trim().toUpperCase(),
      },
      district: draft.district.trim(),
      number: draft.number.trim(),
      postalCode: digitsOnly(draft.postalCode),
      street: draft.street.trim(),
    },
    federalTaxNumber: digitsOnly(draft.federalTaxNumber),
    legalName: draft.legalName.trim(),
    name: draft.name.trim(),
    ...optional("cityTaxNumber", draft.cityTaxNumber),
    ...optional("email", draft.email),
    ...optional("phone", draft.phone),
    ...optional("simplesNacionalTaxRegime", draft.simplesNacionalTaxRegime),
    ...optional("specialTaxRegime", draft.specialTaxRegime),
    ...optional("stateTaxNumber", draft.stateTaxNumber),
    ...optional("taxRegime", draft.taxRegime),
  };
  const activities = buildEconomicActivities(draft);
  if (activities.length) issuerProfile.economicActivities = activities;
  return { issuerProfile };
}

function buildEconomicActivities(
  draft: IssuerProfileDraft,
): FiscalEconomicActivity[] {
  const activities: FiscalEconomicActivity[] = [];
  const main = draft.mainActivityCode.trim();
  if (main) activities.push({ code: main, type: "main" });
  for (const code of draft.secondaryActivityCodes.split(",")) {
    const trimmed = code.trim();
    if (trimmed) activities.push({ code: trimmed, type: "secondary" });
  }
  return activities;
}

function optional<Key extends keyof FiscalIssuerProfileInput>(
  key: Key,
  value: string,
) {
  const trimmed = value.trim();
  return trimmed ? { [key]: trimmed } : {};
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readText(value: unknown) {
  return typeof value === "string" ? value : "";
}
