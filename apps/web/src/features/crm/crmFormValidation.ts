const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidCrmPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export function validateQuickLeadInput(input: {
  email: string;
  name: string;
  phone: string;
}) {
  if (!input.name.trim()) return "Informe o nome do contato.";
  if (input.phone.trim() && !isValidCrmPhone(input.phone)) {
    return "Informe um telefone válido com DDD.";
  }
  if (input.email.trim() && !emailPattern.test(input.email.trim())) {
    return "Informe um e-mail válido.";
  }
  return null;
}

export function validateFinancingInput(input: {
  downpayment: number;
  interestRate: number;
  months: number;
  vehicleValue: number;
}) {
  if (!Number.isFinite(input.vehicleValue) || input.vehicleValue <= 0) {
    return "Informe um valor de veículo maior que zero.";
  }
  if (!Number.isFinite(input.downpayment) || input.downpayment < 0) {
    return "A entrada não pode ser negativa.";
  }
  if (input.downpayment > input.vehicleValue) {
    return "A entrada não pode ser maior que o valor do veículo.";
  }
  if (!Number.isFinite(input.months) || input.months <= 0) {
    return "Informe uma quantidade de parcelas válida.";
  }
  if (
    !Number.isFinite(input.interestRate) ||
    input.interestRate < 0 ||
    input.interestRate > 10
  ) {
    return "Informe uma taxa de juros válida.";
  }
  return null;
}
