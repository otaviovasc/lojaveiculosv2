import {
  cents,
  json,
  legacyMetadata,
  mapFuel,
  nullableString,
} from "./common.mjs";
import { mapSalePaymentMethod } from "./sale-mapping.mjs";

export function buyerSnapshot(sale, lead) {
  const address = [sale.buyerAddress, sale.buyerBairro]
    .map((value) => nullableString(value))
    .filter(Boolean)
    .join(", ");
  const buyer = {
    address: address || null,
    birthday: sale.buyerBirthday ?? null,
    city: nullableString(sale.buyerCity, 120),
    cpf: nullableString(sale.buyerCpf, 32),
    document: nullableString(sale.buyerCpf, 32),
    documentType: nullableString(sale.buyerDocumentType, 16) ?? "CPF",
    email:
      nullableString(sale.buyerEmail, 254) ?? nullableString(lead?.email, 254),
    estadoCivil: nullableString(sale.buyerEstadoCivil, 80),
    name:
      nullableString(sale.buyerName, 191) ?? nullableString(lead?.name, 191),
    nacionalidade: nullableString(sale.buyerNacionalidade, 80),
    neighborhood: nullableString(sale.buyerBairro, 120),
    phone:
      nullableString(sale.buyerPhone1, 40) ?? nullableString(lead?.phone, 40),
    phone1: nullableString(sale.buyerPhone1, 40),
    phone2: nullableString(sale.buyerPhone2, 40),
    phone3: nullableString(sale.buyerPhone3, 40),
    postalCode: nullableString(sale.buyerCep, 32),
    profissao: nullableString(sale.buyerProfissao, 120),
    rg: nullableString(sale.buyerRg, 32),
    state: nullableString(sale.buyerState, 2)?.toUpperCase() ?? null,
    witnesses: [
      witness(sale.witness1Name, sale.witness1Document),
      witness(sale.witness2Name, sale.witness2Document),
    ].filter(Boolean),
  };
  return legacyMetadata("Sale.buyer", { id: sale.id, ...buyer }, buyer);
}

export function listingSnapshot(sale, vehicle, primaryPhoto) {
  const source = { ...vehicle, ...json(sale.vehicleSnapshot) };
  const fallbackTitle = nullableString(
    [source.marca, source.modelo, source.versao].filter(Boolean).join(" "),
    191,
  );
  const listing = {
    brandName:
      nullableString(source.marca, 120) ??
      nullableString(vehicle?.brand?.nome_marca, 120),
    chassi: nullableString(source.chassi, 32),
    cilindrada: nullableString(source.cilindrada, 32),
    colorName: nullableString(source.cor, 64),
    fuelType: mapFuel(source.combustivel),
    manufactureYear: numberOrNull(source.ano_fabricacao),
    mileageKm: numberOrNull(sale.saleKm ?? source.km),
    modelName:
      nullableString(source.modelo, 160) ??
      nullableString(vehicle?.model?.nome_modelo, 160),
    modelYear: numberOrNull(source.ano_modelo),
    numero_motor: nullableString(source.numero_motor, 64),
    peso_bruto: nullableString(source.peso_bruto, 32),
    peso_liquido: nullableString(source.peso_liquido, 32),
    plate: nullableString(source.placa_final, 16)?.toUpperCase() ?? null,
    potencia: nullableString(source.potencia, 32),
    primaryMediaUrl: nullableString(primaryPhoto?.url_foto),
    renavam: nullableString(source.renavam, 32),
    title:
      nullableString(source.titulo_anuncio, 191) ??
      fallbackTitle ??
      `Veículo V1 ${vehicle.id}`,
    trimName: nullableString(source.versao, 160),
    unitLabel: `V1 #${vehicle.id}`,
  };
  return legacyMetadata(
    "Sale.vehicleSnapshot",
    { id: sale.id, ...json(sale.vehicleSnapshot) },
    listing,
  );
}

export function saleSourceSnapshot(sale, source, payments) {
  const financingPayment = payments.find(
    (payment) => mapSalePaymentMethod(payment.method) === "financing",
  );
  const tradeInPayment = payments.find(
    (payment) => mapSalePaymentMethod(payment.method) === "trade_in",
  );
  const financingMetadata = json(financingPayment?.metadata);
  const tradeInVehicle = json(json(tradeInPayment?.metadata).tradeInVehicle);
  const financingValue = financingPayment
    ? cents(financingMetadata.financingValue ?? financingPayment.value)
    : null;
  const installments = positiveInteger(financingMetadata.installments);
  const insurancePremium = cents(sale.seguroPremio);
  const documentationValue = cents(sale.transferValue);
  const commissionValue = cents(sale.sellerCommission);

  return legacyMetadata(
    "SaleSource",
    source ?? { id: sale.sourceId ?? sale.id },
    {
      commission: {
        amountValueCents: commissionValue,
        enabled: Boolean(commissionValue && commissionValue > 0),
        notes: nullableString(sale.notes),
        percentageRate: null,
        ruleType: "fixed",
      },
      documentation: {
        chargedAmountCents: documentationValue,
        hasLien:
          typeof sale.transferComAlienacao === "boolean"
            ? sale.transferComAlienacao
            : null,
        notes: nullableString(sale.transferStatus),
        status:
          documentationValue && documentationValue > 0 ? "charged" : "pending",
      },
      financing: financingPayment
        ? {
            bankName:
              nullableString(financingMetadata.bank, 191) ??
              "Financiamento legado",
            financedAmountCents: financingValue,
            financingRank: financingRank(financingMetadata.financingRank),
            installmentAmountCents:
              financingValue && installments
                ? Math.round(financingValue / installments)
                : null,
            installmentsCount: installments,
            rank: financingRank(financingMetadata.financingRank),
            status: "approved",
          }
        : { rank: "R1", status: "pending" },
      insurance:
        insurancePremium && insurancePremium > 0
          ? {
              appliedCommissionPercentage: numberOrNull(sale.seguroPctAplicado),
              companyName: "Seguro legado",
              premiumCents: insurancePremium,
              status: "issued",
            }
          : { status: "pending" },
      source: nullableString(source?.name, 120) ?? "v1_migration",
      tradeIn: tradeInPayment
        ? {
            brand: nullableString(tradeInVehicle.brand, 120),
            chassi: nullableString(tradeInVehicle.chassi, 32),
            color: nullableString(tradeInVehicle.color, 64),
            enabled: true,
            mileageKm: numberOrNull(tradeInVehicle.km),
            model: nullableString(tradeInVehicle.model, 160),
            plate:
              nullableString(tradeInVehicle.plate, 16)?.toUpperCase() ?? null,
            renavam: nullableString(tradeInVehicle.renavam, 32),
            valuationCents: cents(tradeInPayment.value),
            version: nullableString(tradeInVehicle.version, 160),
            yearFabrication: numberOrNull(tradeInVehicle.yearFabrication),
            yearModel: numberOrNull(tradeInVehicle.yearModel),
          }
        : { enabled: false },
    },
  );
}

export function salePaymentDetails(payment) {
  const metadata = json(payment.metadata);
  return {
    installments: positiveInteger(metadata.installments),
    metadata: legacyMetadata("SalePayment", payment, {
      description: nullableString(payment.description),
      financingValueCents: cents(metadata.financingValue),
      financingRank: financingRank(metadata.financingRank),
    }),
  };
}

function financingRank(value) {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();
  return ["R1", "R2", "R3", "R4", "R5"].includes(normalized)
    ? normalized
    : "R1";
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function positiveInteger(value) {
  const parsed = numberOrNull(value);
  return parsed && parsed > 0 ? Math.trunc(parsed) : null;
}

function witness(name, document) {
  const normalizedName = nullableString(name, 191);
  const normalizedDocument = nullableString(document, 32);
  return normalizedName || normalizedDocument
    ? { document: normalizedDocument, name: normalizedName }
    : null;
}
