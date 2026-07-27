import type { FinancingLeadInput } from "../../domains/financing/ports/financingProviderGateway.js";

export function leadPayload(lead: FinancingLeadInput) {
  return {
    lead: {
      address: lead.address
        ? {
            city: lead.address.city,
            complement: lead.address.complement,
            district: lead.address.district,
            number: lead.address.number,
            state: lead.address.state,
            street: lead.address.street,
            zip_code: lead.address.zipCode,
          }
        : undefined,
      birthdate: lead.birthdate,
      cpf_cnpj: lead.cpfCnpj,
      email: lead.email,
      has_cnh: lead.hasCnh,
      monthly_income: lead.monthlyIncomeCents,
      name: lead.name,
      phone_number: lead.phoneNumber,
      retrieve_gender: lead.retrieveGender,
      retrieve_occupation: lead.retrieveOccupation,
      retrieve_profession: lead.retrieveProfession,
    },
  };
}
