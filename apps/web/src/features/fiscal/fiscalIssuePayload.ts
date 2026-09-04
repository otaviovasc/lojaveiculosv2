import { validateCpfCnpj } from "../sales/validation";
import {
  amountFromInput,
  computeIssueTotalCents,
  computeItemTotalCents,
  type FiscalIssueDraft,
  type IssueStep,
} from "./fiscalIssueModel";
import type {
  IssueFiscalDocumentInput,
  VehicleNfeMetadata,
  VehicleNfeVehicle,
} from "./types";

export type IssueValidationResult = {
  errors: Record<string, string>;
  firstStep: IssueStep | null;
};

const itemErrorSteps: Record<string, IssueStep> = {
  items: "items",
  vehicle: "items",
};
const recipientErrorSteps: Record<string, IssueStep> = {
  buyerDocument: "recipient",
  buyerEmail: "recipient",
  buyerName: "recipient",
};

export function buildVehicleNfeMetadata(
  draft: FiscalIssueDraft,
): VehicleNfeMetadata {
  const price = computeIssueTotalCents(draft.items) / 100;
  return {
    buyer: {
      document: digitsOnly(draft.recipient.document),
      name: draft.recipient.name.trim(),
    },
    fiscal: {
      cfop: draft.fiscal.cfop.trim(),
      ncm: digitsOnly(draft.fiscal.ncm),
      origin: draft.fiscal.origin,
      ...(draft.fiscal.cst.trim() ? { cst: draft.fiscal.cst.trim() } : {}),
      ...(draft.fiscal.csosn.trim()
        ? { csosn: draft.fiscal.csosn.trim() }
        : {}),
      ...taxRateEntry(draft.fiscal.icmsRate, "icms"),
      ...taxRateEntry(draft.fiscal.ipiRate, "ipi"),
      ...taxRateEntry(draft.fiscal.pisRate, "pis"),
      ...taxRateEntry(draft.fiscal.cofinsRate, "cofins"),
    },
    operation: { type: draft.operationType },
    sale: {
      ...(draft.saleId ? { id: draft.saleId } : {}),
      price,
    },
    vehicle: cleanVehicle(draft.vehicle),
  };
}

export function buildIssueDocumentInput(
  draft: FiscalIssueDraft,
): IssueFiscalDocumentInput {
  if (draft.kind === "nfse") {
    const amount = amountFromInput(draft.nfse.grossAmount);
    return {
      documentKind: "nfse",
      documentType: "nfse_service_commission",
      externalReference: draft.externalReference.trim() || "manual-nfse",
      metadata: {
        competence: draft.nfse.competence,
        grossAmount: amount,
      },
      recipientId: draft.nfse.recipientId || null,
      templateId: draft.nfse.templateId || null,
      templateVariables: createNfseTemplateVariables(
        amount,
        draft.nfse.competence,
      ),
    };
  }

  const vehicleNfe = buildVehicleNfeMetadata(draft);
  return {
    documentKind: "nfe",
    documentType: "nfe_vehicle_sale",
    externalReference: draft.externalReference.trim() || "manual-nfe",
    metadata: {
      additionalItems: draft.items.slice(1).map((item) => ({
        cfop: item.cfop,
        description: item.description,
        discountAmount: item.discountAmount,
        ncm: item.ncm,
        quantity: item.quantity,
        totalAmount: computeItemTotalCents(item) / 100,
        unitAmount: item.unitAmount,
      })),
      operationType: draft.operationType,
      payments: draft.payments,
      recipient: {
        city: draft.recipient.city,
        cityCode: draft.recipient.cityCode,
        district: draft.recipient.district,
        document: digitsOnly(draft.recipient.document),
        email: draft.recipient.email,
        name: draft.recipient.name,
        number: draft.recipient.number,
        phone: digitsOnly(draft.recipient.phone),
        postalCode: digitsOnly(draft.recipient.postalCode),
        state: draft.recipient.state,
        street: draft.recipient.street,
      },
      vehicleNfe,
    },
  };
}

export function validateIssueDraft(
  draft: FiscalIssueDraft,
): IssueValidationResult {
  const errors: Record<string, string> = {};
  const steps: IssueStep[] = [];
  const fail = (key: string, message: string) => {
    errors[key] = message;
    const step = recipientErrorSteps[key] ?? itemErrorSteps[key] ?? "origin";
    if (!steps.includes(step)) steps.push(step);
  };

  if (draft.origin === "sale" && !draft.saleId) {
    fail("origin", "Selecione a venda que origina esta nota.");
  }
  if (draft.origin === "entry" && !draft.entryId) {
    fail("origin", "Selecione o lançamento financeiro que origina esta nota.");
  }
  if (draft.origin === "standalone" && !draft.externalReference.trim()) {
    fail("origin", "Informe uma referência externa para a emissão avulsa.");
  }

  if (draft.kind === "nfse") {
    if (!draft.nfse.templateId) {
      fail("origin", "Selecione o tipo de comissão (modelo de NFS-e).");
    }
    if (amountFromInput(draft.nfse.grossAmount) <= 0) {
      fail("items", "O valor da comissão deve ser maior que zero.");
    }
    return { errors, firstStep: steps[0] ?? null };
  }

  if (!draft.recipient.name.trim()) {
    fail("buyerName", "Nome do destinatário é obrigatório.");
  }
  const document = digitsOnly(draft.recipient.document);
  if (!document) {
    fail("buyerDocument", "CPF/CNPJ do destinatário é obrigatório.");
  } else if (!validateCpfCnpj(document)) {
    fail("buyerDocument", "CPF/CNPJ do destinatário é inválido.");
  }
  if (draft.recipient.email && !/^\S+@\S+\.\S+$/.test(draft.recipient.email)) {
    fail("buyerEmail", "E-mail do destinatário é inválido.");
  }

  draft.items.forEach((item, index) => {
    if (!item.description.trim()) {
      fail("items", `A descrição do item ${index + 1} é obrigatória.`);
    }
    if (!(item.quantity > 0)) {
      fail(
        "items",
        `A quantidade do item ${index + 1} deve ser maior que zero.`,
      );
    }
    if (!(item.unitAmount > 0)) {
      fail(
        "items",
        `O valor unitário do item ${index + 1} deve ser maior que zero.`,
      );
    }
  });

  if (!draft.vehicle.id?.trim()) {
    fail("vehicle", "Informe o código do veículo (estoque ou anúncio).");
  }
  if (!draft.vehicle.brand?.trim()) {
    fail("vehicle", "A marca do veículo é obrigatória para a NF-e.");
  }
  if (!draft.vehicle.model?.trim()) {
    fail("vehicle", "O modelo do veículo é obrigatório para a NF-e.");
  }
  if (!draft.vehicle.modelYear && !draft.vehicle.year) {
    fail("vehicle", "Informe o ano modelo do veículo.");
  }
  if (draft.vehicle.condition === "new" && !draft.vehicle.chassis?.trim()) {
    fail("vehicle", "O chassi é obrigatório para veículo novo.");
  }
  if (!digitsOnly(draft.fiscal.ncm)) {
    fail("vehicle", "O NCM é obrigatório.");
  }
  if (!draft.fiscal.cfop.trim()) {
    fail("vehicle", "O CFOP é obrigatório.");
  }
  if (!draft.fiscal.cst.trim() && !draft.fiscal.csosn.trim()) {
    fail("vehicle", "Informe o CST ou o CSOSN.");
  }

  return { errors, firstStep: steps[0] ?? null };
}

export function createNfseTemplateVariables(
  amount: number,
  competence: string,
  recipient?: { documentNumber?: string; legalName?: string },
) {
  const [year, month] = competence.split("-");
  return {
    invoice: {
      competenceMonth: month,
      competenceYear: year,
      grossAmount: amount,
      irrfAmount: 0,
      issAmount: 0,
      netAmount: amount,
    },
    recipient: {
      document: recipient?.documentNumber,
      legalName: recipient?.legalName,
    },
    sale: {
      commissionAmount: amount,
      periodReference: `${month}/${year}`,
    },
  };
}

function cleanVehicle(vehicle: VehicleNfeVehicle): VehicleNfeVehicle {
  return Object.fromEntries(
    Object.entries(vehicle).filter(
      ([, value]) => value !== undefined && value !== "" && value !== null,
    ),
  ) as VehicleNfeVehicle;
}

function taxRateEntry(rate: string, key: string) {
  const parsed = amountFromInput(rate);
  return parsed > 0 ? { [key]: { rate: parsed } } : {};
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}
