import type { FiscalIssueInput } from "../../domains/fiscal/ports/fiscalProviderGateway.js";
import {
  assertFields,
  booleanValue,
  compact,
  digits,
  type JsonRecord,
  normalizeProductItem,
  numberValue,
  productItemDefaults,
  stringValue,
  today,
  toRecord,
} from "./spedyFiscalPayloadSupport.js";

export function buildSpedyIssuePayload(
  input: FiscalIssueInput,
  taxDefaults: JsonRecord,
) {
  return input.documentKind === "nfe"
    ? buildProductInvoice(input, taxDefaults)
    : buildServiceInvoice(input, taxDefaults);
}

function buildProductInvoice(input: FiscalIssueInput, taxDefaults: JsonRecord) {
  const nfeDefaults = toRecord(taxDefaults.nfe);
  const vehiclePayload = toRecord(input.metadata.vehicleNfePayload);
  const primaryItem = {
    ...productItemDefaults(nfeDefaults),
    ...toRecord(nfeDefaults.item),
    ...toRecord(vehiclePayload.item),
  };
  const recipient = toRecord(input.metadata.recipient);
  const receiver = {
    ...toRecord(vehiclePayload.receiver),
    name:
      stringValue(recipient.name) ??
      stringValue(toRecord(vehiclePayload.receiver).name),
    federalTaxNumber:
      digits(stringValue(recipient.document)) ??
      stringValue(toRecord(vehiclePayload.receiver).federalTaxNumber),
    ...(stringValue(recipient.email)
      ? { email: stringValue(recipient.email) }
      : {}),
    ...(digits(stringValue(recipient.phone))
      ? { phoneNumber: digits(stringValue(recipient.phone)) }
      : {}),
    address: compact({
      city: compact({
        code: numberValue(recipient.cityCode),
        name: stringValue(recipient.city),
        state: stringValue(recipient.state)?.toLowerCase(),
      }),
      district: stringValue(recipient.district),
      number: stringValue(recipient.number),
      postalCode: digits(stringValue(recipient.postalCode)),
      street: stringValue(recipient.street),
    }),
  };
  const additionalItems = Array.isArray(input.metadata.additionalItems)
    ? input.metadata.additionalItems.map(toRecord)
    : [];
  const items = [primaryItem, ...additionalItems].filter(
    (item) => Object.keys(item).length > 0,
  );
  const required = [
    ["receiver.name", receiver.name],
    ["receiver.federalTaxNumber", receiver.federalTaxNumber],
    ["items", items.length ? items : null],
    ["defaults.nfe.operationNature", nfeDefaults.operationNature],
    ["defaults.nfe.destination", nfeDefaults.destination],
    ["defaults.nfe.isFinalCustomer", nfeDefaults.isFinalCustomer],
    ["defaults.nfe.operationType", nfeDefaults.operationType],
    ["defaults.nfe.presenceType", nfeDefaults.presenceType],
    ["defaults.nfe.purposeType", nfeDefaults.purposeType],
  ] as const;
  assertFields(required);

  return compact({
    additionalInformation: stringValue(input.metadata.additionalInformation),
    destination: stringValue(nfeDefaults.destination),
    effectiveDate: stringValue(input.metadata.effectiveDate) ?? today(),
    integrationId: input.integrationId,
    isFinalCustomer: booleanValue(nfeDefaults.isFinalCustomer),
    items: items.map(normalizeProductItem),
    operationNature: stringValue(nfeDefaults.operationNature),
    operationType: stringValue(nfeDefaults.operationType),
    payments: Array.isArray(input.metadata.payments)
      ? input.metadata.payments
      : undefined,
    presenceType: stringValue(nfeDefaults.presenceType),
    purposeType: stringValue(nfeDefaults.purposeType),
    receiver,
    sendEmailToCustomer: Boolean(stringValue(recipient.email)),
    series: stringValue(nfeDefaults.series),
  });
}

function buildServiceInvoice(input: FiscalIssueInput, taxDefaults: JsonRecord) {
  const nfseDefaults = toRecord(taxDefaults.nfse);
  const recipient = toRecord(input.metadata.recipient);
  const template = toRecord(input.metadata.template);
  const totalAmount = numberValue(
    input.metadata.grossAmount ?? input.metadata.invoiceAmount,
  );
  const description =
    stringValue(input.metadata.renderedDescription) ??
    stringValue(template.description);
  const receiver = compact({
    address: toRecord(recipient.address),
    email: stringValue(recipient.email),
    federalTaxNumber: digits(stringValue(recipient.documentNumber)),
    name: stringValue(recipient.legalName),
    phoneNumber: digits(stringValue(recipient.phone)),
  });
  const cityServiceCode =
    stringValue(template.cityServiceCode) ??
    stringValue(nfseDefaults.cityServiceCode);
  const federalServiceCode =
    stringValue(template.serviceNationalCode) ??
    stringValue(nfseDefaults.federalServiceCode);
  const taxationType =
    stringValue(template.defaultTaxationType) ??
    stringValue(nfseDefaults.taxationType);
  const taxLocation =
    stringValue(template.defaultServiceLocation) ??
    stringValue(nfseDefaults.taxLocation);
  assertFields([
    ["receiver.name", receiver.name],
    ["receiver.federalTaxNumber", receiver.federalTaxNumber],
    ["description", description],
    ["total.invoiceAmount", totalAmount],
    ["cityServiceCode", cityServiceCode],
    ["federalServiceCode", federalServiceCode],
    ["taxationType", taxationType],
    ["taxLocation", taxLocation],
  ]);
  return compact({
    additionalInformation: stringValue(input.metadata.additionalInformation),
    cityServiceCode,
    cnaeCode:
      stringValue(template.cnaeCode) ?? stringValue(nfseDefaults.cnaeCode),
    cstPisCofins:
      stringValue(template.cstPisCofins) ??
      stringValue(nfseDefaults.cstPisCofins),
    description,
    effectiveDate: stringValue(input.metadata.competence) ?? today(),
    federalServiceCode,
    integrationId: input.integrationId,
    nationalTaxationCode:
      stringValue(template.nationalTaxationCode) ??
      stringValue(nfseDefaults.nationalTaxationCode),
    nbsCode: stringValue(template.nbsCode) ?? stringValue(nfseDefaults.nbsCode),
    receiver,
    sendEmailToCustomer:
      typeof input.metadata.sendEmailToCustomer === "boolean"
        ? input.metadata.sendEmailToCustomer
        : Boolean(receiver.email),
    simplesNacionalAnnex:
      stringValue(template.simplesNacionalAnnex) ??
      stringValue(nfseDefaults.simplesNacionalAnnex),
    taxationType,
    taxLocation,
    total: {
      invoiceAmount: totalAmount,
      ...toRecord(template.retentionConfig),
    },
  });
}
