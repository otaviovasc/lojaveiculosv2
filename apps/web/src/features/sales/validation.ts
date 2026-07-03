// Validation logic for Sales flow in V2, based on V1 primitives.

export type RequiredFieldsPolicy = {
  buyerName: boolean;
  buyerDocument: boolean;
  buyerAddress: boolean;
  buyerCityState: boolean;
  buyerNacionalidade: boolean;
  buyerEstadoCivil: boolean;
  buyerProfissao: boolean;
  vehicleRenavam: boolean;
  vehicleChassi: boolean;
  vehicleNfeDetails: boolean;
};

export const DEFAULT_REQUIRED_POLICY: RequiredFieldsPolicy = {
  buyerName: true,
  buyerDocument: true,
  buyerAddress: true,
  buyerCityState: true,
  buyerNacionalidade: false,
  buyerEstadoCivil: false,
  buyerProfissao: false,
  vehicleRenavam: true,
  vehicleChassi: true,
  vehicleNfeDetails: false,
};

export function validateCpf(cpf: string): boolean {
  const numbers = cpf.replace(/\D/g, "");
  if (numbers.length !== 11) return false;
  if (/^(\d)\1+$/.test(numbers)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers[i]!) * (10 - i);
  }
  let digit1 = 11 - (sum % 11);
  if (digit1 > 9) digit1 = 0;
  if (parseInt(numbers[9]!) !== digit1) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers[i]!) * (11 - i);
  }
  let digit2 = 11 - (sum % 11);
  if (digit2 > 9) digit2 = 0;
  if (parseInt(numbers[10]!) !== digit2) return false;

  return true;
}

export function validateCnpj(cnpj: string): boolean {
  const numbers = cnpj.replace(/\D/g, "");
  if (numbers.length !== 14) return false;
  if (/^(\d)\1+$/.test(numbers)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(numbers[i]!) * weights1[i]!;
  }
  let digit1 = sum % 11;
  digit1 = digit1 < 2 ? 0 : 11 - digit1;
  if (parseInt(numbers[12]!) !== digit1) return false;

  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(numbers[i]!) * weights2[i]!;
  }
  let digit2 = sum % 11;
  digit2 = digit2 < 2 ? 0 : 11 - digit2;
  if (parseInt(numbers[13]!) !== digit2) return false;

  return true;
}

export function validateCpfCnpj(value: string): boolean {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length === 11) return validateCpf(numbers);
  if (numbers.length === 14) return validateCnpj(numbers);
  return false;
}

/**
 * Returns required fields policy based on selected documents
 */
export function getRequiredFieldsPolicy(
  selectedDocs: readonly string[] = [],
  emitirNFe = false,
): RequiredFieldsPolicy {
  const hasContrato = selectedDocs.includes("sale_contract");
  const hasProcuracao = selectedDocs.includes("power_of_attorney");
  const hasGarantia =
    selectedDocs.includes("warranty") || selectedDocs.includes("garantia");
  const hasRecibo =
    selectedDocs.includes("sale_receipt") || selectedDocs.includes("recibo");
  const hasTermo =
    selectedDocs.includes("delivery_term") ||
    selectedDocs.includes("termo_entrega");

  const hasAnyDoc = selectedDocs.length > 0;

  return {
    buyerName: true,
    buyerDocument: hasAnyDoc,
    buyerAddress: hasContrato || hasProcuracao,
    buyerCityState: hasContrato || hasProcuracao,
    buyerNacionalidade: hasProcuracao,
    buyerEstadoCivil: hasProcuracao,
    buyerProfissao: hasProcuracao,
    vehicleRenavam: hasContrato || hasProcuracao || hasGarantia,
    vehicleChassi: hasContrato || hasProcuracao || hasGarantia,
    vehicleNfeDetails: emitirNFe,
  };
}

/**
 * Validates a sale record against selected documents and NFe emission
 */
export function validateSaleRecord(
  buyerSnapshot: Record<string, unknown>,
  listingSnapshot: Record<string, unknown>,
  selectedDocs: readonly string[],
  emitirNFe = false,
): { isValid: boolean; errors: Record<string, string> } {
  const policy = getRequiredFieldsPolicy(selectedDocs, emitirNFe);
  const errors: Record<string, string> = {};

  // Buyer Name
  if (
    policy.buyerName &&
    (!buyerSnapshot.name || !String(buyerSnapshot.name).trim())
  ) {
    errors.buyerName = "Nome do comprador é obrigatório.";
  }

  // Buyer Document (CPF/CNPJ)
  if (policy.buyerDocument) {
    const doc = String(
      buyerSnapshot.document || buyerSnapshot.cpf || "",
    ).replace(/\D/g, "");
    if (!doc) {
      errors.buyerDocument = "CPF/CNPJ é obrigatório.";
    } else if (!validateCpfCnpj(doc)) {
      errors.buyerDocument = "CPF/CNPJ inválido.";
    }
  }

  // Buyer Address
  if (
    policy.buyerAddress &&
    (!buyerSnapshot.address || String(buyerSnapshot.address).trim().length < 5)
  ) {
    errors.buyerAddress =
      "Endereço completo é obrigatório (mínimo 5 caracteres).";
  }

  // Buyer City/State
  if (policy.buyerCityState) {
    if (!buyerSnapshot.city || !String(buyerSnapshot.city).trim()) {
      errors.buyerCity = "Cidade é obrigatória.";
    }
    if (!buyerSnapshot.state || !String(buyerSnapshot.state).trim()) {
      errors.buyerState = "Estado é obrigatório.";
    }
  }

  // Buyer Nacionalidade, Estado Civil, Profissão
  if (
    policy.buyerNacionalidade &&
    (!buyerSnapshot.nacionalidade ||
      !String(buyerSnapshot.nacionalidade).trim())
  ) {
    errors.buyerNacionalidade = "Nacionalidade é obrigatória.";
  }
  if (
    policy.buyerEstadoCivil &&
    (!buyerSnapshot.estadoCivil || !String(buyerSnapshot.estadoCivil).trim())
  ) {
    errors.buyerEstadoCivil = "Estado civil é obrigatório.";
  }
  if (
    policy.buyerProfissao &&
    (!buyerSnapshot.profissao || !String(buyerSnapshot.profissao).trim())
  ) {
    errors.buyerProfissao = "Profissão é obrigatória.";
  }

  // Vehicle Renavam
  if (policy.vehicleRenavam) {
    const renavam = String(listingSnapshot.renavam || "").replace(/\D/g, "");
    if (!renavam) {
      errors.vehicleRenavam = "Renavam é obrigatório.";
    } else if (renavam.length !== 11) {
      errors.vehicleRenavam = "Renavam deve ter exatamente 11 dígitos.";
    }
  }

  // Vehicle Chassi
  if (policy.vehicleChassi) {
    const chassi = String(listingSnapshot.chassi || "").trim();
    if (!chassi) {
      errors.vehicleChassi = "Chassi é obrigatório.";
    } else if (chassi.length !== 17) {
      errors.vehicleChassi = "Chassi deve ter exatamente 17 caracteres.";
    }
  }

  // Vehicle NF-e details
  if (policy.vehicleNfeDetails) {
    if (!listingSnapshot.potencia || !String(listingSnapshot.potencia).trim()) {
      errors.vehiclePotencia = "Potência do motor é obrigatória para NF-e.";
    }
    if (
      !listingSnapshot.cilindrada ||
      !String(listingSnapshot.cilindrada).trim()
    ) {
      errors.vehicleCilindrada = "Cilindradas são obrigatórias para NF-e.";
    }
    if (
      !listingSnapshot.peso_liquido ||
      !String(listingSnapshot.peso_liquido).trim()
    ) {
      errors.vehiclePesoLiquido = "Peso líquido é obrigatório para NF-e.";
    }
    if (
      !listingSnapshot.peso_bruto ||
      !String(listingSnapshot.peso_bruto).trim()
    ) {
      errors.vehiclePesoBruto = "Peso bruto é obrigatório para NF-e.";
    }
    if (
      !listingSnapshot.numero_motor ||
      !String(listingSnapshot.numero_motor).trim()
    ) {
      errors.vehicleNumeroMotor = "Número do motor é obrigatório para NF-e.";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
