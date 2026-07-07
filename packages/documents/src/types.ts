export const documentTemplateModes = ["editable", "locked"] as const;
export type DocumentTemplateMode = (typeof documentTemplateModes)[number];

export const documentTemplateSources = ["system", "store"] as const;
export type DocumentTemplateSource = (typeof documentTemplateSources)[number];

export const documentTemplateContexts = [
  "store",
  "vehicle",
  "sale",
  "reservation",
  "customer",
  "finance",
  "test_drive",
  "fiscal",
  "report",
] as const;
export type DocumentTemplateContext = (typeof documentTemplateContexts)[number];

export const documentTemplateKeys = [
  "sale_contract",
  "sale_contract_as_is",
  "consignment_contract",
  "sale_receipt",
  "reservation_receipt",
  "delivery_term",
  "trade_in_power_of_attorney",
  "test_drive_term",
  "used_vehicle_warranty",
  "finance_entry_receipt",
  "financial_report",
  "vehicle_checklist",
  "vehicle_checklist_summary",
  "commission_seller_report",
  "owner_summary_report",
  "internal_invoice_control",
] as const;
export type DocumentTemplateKey = (typeof documentTemplateKeys)[number];

export type DocumentBlock =
  | DocumentClauseBlock
  | DocumentFieldGridBlock
  | DocumentHeadingBlock
  | DocumentParagraphBlock
  | DocumentSignatureBlock
  | DocumentTableBlock;

export type DocumentBlockBase<Type extends string> = {
  id: string;
  locked?: boolean;
  reviewRequired?: boolean;
  type: Type;
};

export type DocumentHeadingBlock = DocumentBlockBase<"heading"> & {
  text: string;
};

export type DocumentParagraphBlock = DocumentBlockBase<"paragraph"> & {
  body: string;
};

export type DocumentClauseBlock = DocumentBlockBase<"clause"> & {
  body: string;
  label?: string;
};

export type DocumentFieldGridBlock = DocumentBlockBase<"field_grid"> & {
  fields: readonly { label: string; token: string }[];
  title: string;
};

export type DocumentTableBlock = DocumentBlockBase<"table"> & {
  columns: readonly string[];
  preset?: string;
  title: string;
};

export type DocumentSignatureBlock = DocumentBlockBase<"signature"> & {
  roles: readonly string[];
  title?: string;
};

export type DocumentTemplateDefinition = {
  availableVariables: readonly string[];
  category: string;
  context: DocumentTemplateContext;
  defaultBlocks: readonly DocumentBlock[];
  description: string;
  kind: string;
  locale: "pt-BR";
  migratedFrom: string;
  mode: DocumentTemplateMode;
  source: DocumentTemplateSource;
  templateKey: DocumentTemplateKey;
  title: string;
};

export type DocumentTemplateContent = {
  blocks: readonly DocumentBlock[];
  title: string;
};
