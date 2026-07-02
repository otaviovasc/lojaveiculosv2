import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { lifecycleColumns, softDeleteColumns } from "./_shared.js";
import { stores, tenants } from "./identity.js";

export const fiscalRecipientDocumentType = pgEnum(
  "fiscal_recipient_document_type",
  ["cnpj", "cpf"],
);

export const fiscalServiceTemplateUseCase = pgEnum(
  "fiscal_service_template_use_case",
  [
    "financing_commission",
    "financing_intermediation",
    "bank_marketing",
    "insurance_commission",
    "consortium_commission",
    "warranty_commission",
    "administrative_service",
    "vehicle_documentation_service",
    "other",
  ],
);

export const fiscalServiceRecipients = pgTable(
  "fiscal_service_recipients",
  {
    ...lifecycleColumns,
    ...softDeleteColumns,
    address: jsonb("address").notNull().default({}),
    defaultServiceTemplateId: uuid("default_service_template_id"),
    documentNumber: varchar("document_number", { length: 32 }).notNull(),
    documentType: fiscalRecipientDocumentType("document_type").notNull(),
    email: varchar("email", { length: 191 }),
    isActive: boolean("is_active").notNull().default(true),
    legalName: varchar("legal_name", { length: 191 }).notNull(),
    municipalRegistration: varchar("municipal_registration", { length: 80 }),
    notes: text("notes"),
    phone: varchar("phone", { length: 40 }),
    stateRegistration: varchar("state_registration", { length: 80 }),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    tradeName: varchar("trade_name", { length: 191 }),
  },
  (table) => [
    index("fiscal_service_recipients_store_idx").on(table.storeId),
    uniqueIndex("fiscal_service_recipients_document_unique").on(
      table.storeId,
      table.documentNumber,
    ),
  ],
);

export const fiscalServiceInvoiceTemplates = pgTable(
  "fiscal_service_invoice_templates",
  {
    ...lifecycleColumns,
    ...softDeleteColumns,
    cityServiceCode: varchar("city_service_code", { length: 80 }),
    defaultMunicipalityOfIncidence: varchar(
      "default_municipality_of_incidence",
      { length: 120 },
    ),
    defaultServiceLocation: varchar("default_service_location", {
      length: 120,
    }),
    defaultTaxationType: varchar("default_taxation_type", { length: 80 }),
    descriptionTemplate: text("description_template").notNull(),
    includeApproximateTaxes: boolean("include_approximate_taxes")
      .notNull()
      .default(false),
    isActive: boolean("is_active").notNull().default(true),
    isDefaultForRecipient: boolean("is_default_for_recipient")
      .notNull()
      .default(false),
    name: varchar("name", { length: 140 }).notNull(),
    recipientId: uuid("recipient_id").references(
      () => fiscalServiceRecipients.id,
    ),
    requirements: jsonb("requirements").notNull().default({}),
    retentionConfig: jsonb("retention_config").notNull().default({}),
    serviceMunicipalCode: varchar("service_municipal_code", { length: 80 }),
    serviceNationalCode: varchar("service_national_code", {
      length: 40,
    }).notNull(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id),
    taxConfig: jsonb("tax_config").notNull().default({}),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    useCase: fiscalServiceTemplateUseCase("use_case").notNull(),
    version: integer("version").notNull().default(1),
  },
  (table) => [
    index("fiscal_service_invoice_templates_store_idx").on(table.storeId),
    index("fiscal_service_invoice_templates_recipient_idx").on(
      table.recipientId,
    ),
    uniqueIndex("fiscal_service_invoice_templates_name_unique").on(
      table.storeId,
      table.name,
      table.version,
    ),
  ],
);
