import type {
  CreateAgencyStoreInput,
  CreateOwnerStoreInput,
} from "./apiClient";
import { isValidBrazilianCnpj } from "@lojaveiculosv2/shared";
import {
  formatBrazilianCnpj,
  formatBrazilianPhone,
  normalizeBrazilianPhoneDigits,
} from "../../lib/masks";
import { normalizePublicSlug } from "../../lib/utils";

export type OwnerStoreForm = {
  contactPhone: string;
  documentNumber: string;
  publicSlug: string;
  storeLegalName: string;
  storeTradingName: string;
};

export type AgencyStoreForm = {
  publicSlug: string;
  storeTradingName: string;
  tenantId: string;
};

export type OwnerStoreFieldErrors = Partial<
  Record<keyof OwnerStoreForm, string>
>;

export type AgencyStoreFieldErrors = Partial<
  Record<keyof AgencyStoreForm, string>
>;

export type OwnerStoreValidationResult =
  | { input: CreateOwnerStoreInput; ok: true }
  | { errors: OwnerStoreFieldErrors; message: string; ok: false };

export type AgencyStoreValidationResult =
  | { input: CreateAgencyStoreInput; ok: true }
  | { errors: AgencyStoreFieldErrors; message: string; ok: false };

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateOwnerStoreForm(
  form: OwnerStoreForm,
): OwnerStoreValidationResult {
  const errors: OwnerStoreFieldErrors = {};
  const storeTradingName = form.storeTradingName.trim();
  const storeLegalName = form.storeLegalName.trim();
  const publicSlug = normalizePublicSlug(form.publicSlug);
  const documentDigits = onlyDigits(form.documentNumber);
  const phoneDigits = localPhoneDigits(form.contactPhone);

  validateRequiredText(
    errors,
    "storeTradingName",
    storeTradingName,
    "Informe o nome comercial com pelo menos 2 caracteres.",
  );
  validateOptionalText(
    errors,
    "storeLegalName",
    storeLegalName,
    "A razão social deve ter no máximo 191 caracteres.",
  );
  validatePublicSlug(errors, publicSlug);

  if (documentDigits && documentDigits.length !== 14) {
    errors.documentNumber = "Informe um CNPJ completo com 14 dígitos.";
  } else if (documentDigits && !isValidBrazilianCnpj(documentDigits)) {
    errors.documentNumber = "Informe um CNPJ válido.";
  }
  if (phoneDigits && phoneDigits.length !== 10 && phoneDigits.length !== 11) {
    errors.contactPhone = "Informe um telefone com DDD completo.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors, message: "Revise os campos marcados.", ok: false };
  }

  return {
    input: {
      profile: {
        ...(phoneDigits
          ? { contactPhone: formatBrazilianPhone(phoneDigits) }
          : {}),
        ...(documentDigits
          ? { documentNumber: formatBrazilianCnpj(documentDigits) }
          : {}),
      },
      publicSlug,
      ...(storeLegalName ? { storeLegalName } : {}),
      storeTradingName,
    },
    ok: true,
  };
}

export function validateAgencyStoreForm(
  form: AgencyStoreForm,
): AgencyStoreValidationResult {
  const errors: AgencyStoreFieldErrors = {};
  const storeTradingName = form.storeTradingName.trim();
  const publicSlug = normalizePublicSlug(form.publicSlug);
  const tenantId = form.tenantId.trim();

  if (!tenantId) errors.tenantId = "Selecione a conta de agência.";
  validateRequiredText(
    errors,
    "storeTradingName",
    storeTradingName,
    "Informe o nome da concessionária com pelo menos 2 caracteres.",
  );
  validatePublicSlug(errors, publicSlug);

  if (Object.keys(errors).length > 0) {
    return { errors, message: "Revise os campos marcados.", ok: false };
  }

  return {
    input: {
      publicSlug,
      storeTradingName,
      tenantId,
    },
    ok: true,
  };
}

function validateRequiredText<Fields extends string>(
  errors: Partial<Record<Fields, string>>,
  field: Fields,
  value: string,
  message: string,
) {
  if (value.length < 2) {
    errors[field] = message;
    return;
  }
  if (value.length > 191) {
    errors[field] = "Use no máximo 191 caracteres.";
  }
}

function validateOptionalText<Fields extends string>(
  errors: Partial<Record<Fields, string>>,
  field: Fields,
  value: string,
  message: string,
) {
  if (value.length > 191) errors[field] = message;
}

function validatePublicSlug<Fields extends { publicSlug: string }>(
  errors: Partial<Record<keyof Fields, string>>,
  publicSlug: string,
) {
  if (publicSlug.length < 2) {
    errors.publicSlug = "Informe um subdomínio com pelo menos 2 caracteres.";
    return;
  }
  if (publicSlug.length > 80 || !slugPattern.test(publicSlug)) {
    errors.publicSlug = "Use apenas letras, números e hífens no subdomínio.";
  }
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function localPhoneDigits(value: string) {
  return normalizeBrazilianPhoneDigits(value);
}
