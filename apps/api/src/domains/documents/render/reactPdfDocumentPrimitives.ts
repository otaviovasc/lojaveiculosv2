import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { styles } from "./reactPdfDocumentStyles.js";

export type SharedPdfField = {
  label: string;
  value: string;
};

export type SharedPdfSection = {
  fields: readonly SharedPdfField[];
  title: string;
};

export type SharedPdfBrand = {
  accentColor?: string | undefined;
  contactLine?: string | undefined;
  logoText?: string | undefined;
  storeDocument?: string | undefined;
  storeName: string;
};

export type SharedPdfDocument = {
  audit?: SharedPdfSection | undefined;
  brand: SharedPdfBrand;
  clauses: readonly string[];
  fields: readonly SharedPdfSection[];
  intro: string;
  signatures: readonly string[];
  subtitle: string;
  title: string;
};

const e = React.createElement;

export const DocumentPdfRoot = Document;
export const DocumentPdfPage = Page;
export const DocumentPdfText = Text;
export const DocumentPdfView = View;

export async function renderDocumentPdf(
  document: React.ReactElement<React.ComponentProps<typeof Document>>,
): Promise<Uint8Array> {
  const buffer = await renderToBuffer(document);
  return new Uint8Array(buffer);
}

export async function renderSharedDocumentPdf(
  document: SharedPdfDocument,
): Promise<Uint8Array> {
  return renderDocumentPdf(createSharedPdfDocument(document));
}

export function createSharedPdfDocument(document: SharedPdfDocument) {
  return e(
    Document,
    {
      author: document.brand.storeName,
      creator: "Loja Veículos OS",
      keywords: "loja veículos, documento automotivo, fluxo operacional",
      language: "pt-BR",
      producer: "Loja Veículos OS",
      subject: document.subtitle,
      title: document.title,
    },
    e(
      Page,
      { size: "A4", style: styles.page },
      e(DocumentPdfHeader, {
        brand: document.brand,
        subtitle: document.subtitle,
        title: document.title,
      }),
      e(DocumentPdfFooter, { storeName: document.brand.storeName }),
      e(DocumentPdfBody, { document }),
    ),
  );
}

export function DocumentPdfHeader({
  brand,
  subtitle,
  title,
}: {
  brand: SharedPdfBrand;
  subtitle: string;
  title: string;
}) {
  return e(
    View,
    { fixed: true, style: styles.header },
    e(View, { style: styles.logoMark }, e(Text, null, brand.logoText ?? "LV")),
    e(
      View,
      { style: styles.brandCopy },
      e(Text, { style: styles.storeName }, brand.storeName),
      e(Text, { style: styles.headerMuted }, brand.storeDocument ?? ""),
      e(Text, { style: styles.headerMuted }, brand.contactLine ?? ""),
    ),
    e(
      View,
      { style: styles.documentTitle },
      e(Text, { style: styles.headerTitle }, title),
      e(Text, { style: styles.headerMuted }, subtitle),
    ),
  );
}

export function DocumentPdfFooter({ storeName }: { storeName: string }) {
  return e(
    View,
    { fixed: true, style: styles.footer },
    e(
      Text,
      { style: styles.muted },
      `Gerado com segurança por ${storeName} · Loja Veículos OS`,
    ),
    e(Text, {
      render: ({ pageNumber, totalPages }) =>
        `Página ${pageNumber} de ${totalPages}`,
      style: styles.muted,
    }),
  );
}

export function DocumentPdfSignatures({
  signatures,
}: {
  signatures: readonly string[];
}) {
  return e(
    View,
    { style: styles.signatures },
    ...signatures.map((signature) =>
      e(
        View,
        { key: signature, style: styles.signature },
        e(View, { style: styles.signatureLine }),
        e(Text, { style: styles.signatureLabel }, signature),
        e(Text, { style: styles.muted }, "Assinatura"),
      ),
    ),
  );
}

function DocumentPdfBody({ document }: { document: SharedPdfDocument }) {
  return e(
    View,
    { style: styles.body },
    e(Text, { style: styles.intro }, document.intro),
    ...document.fields.map((section) =>
      e(DocumentPdfSection, { key: section.title, section }),
    ),
    document.clauses.length
      ? e(DocumentPdfClauses, { clauses: document.clauses })
      : null,
    document.audit
      ? e(DocumentPdfSection, { section: document.audit, compact: true })
      : null,
    document.signatures.length
      ? e(DocumentPdfSignatures, { signatures: document.signatures })
      : null,
  );
}

function DocumentPdfSection({
  compact = false,
  section,
}: {
  compact?: boolean;
  section: SharedPdfSection;
}) {
  return e(
    View,
    { style: compact ? styles.sectionCompact : styles.section },
    e(Text, { style: styles.sectionTitle }, section.title),
    e(
      View,
      { style: styles.fieldGrid },
      ...section.fields.map((field) =>
        e(
          View,
          { key: `${section.title}-${field.label}`, style: styles.field },
          e(Text, { style: styles.fieldLabel }, field.label),
          e(Text, { style: styles.fieldValue }, field.value),
        ),
      ),
    ),
  );
}

export function DocumentPdfClauses({
  clauses,
}: {
  clauses: readonly string[];
}) {
  const [firstClause, ...remainingClauses] = clauses;
  return e(
    View,
    { style: styles.section },
    firstClause
      ? e(
          View,
          { style: styles.clauseOpening, wrap: false },
          e(Text, { style: styles.sectionTitle }, "Cláusulas"),
          e(DocumentPdfClause, { clause: firstClause, index: 0 }),
        )
      : e(Text, { style: styles.sectionTitle }, "Cláusulas"),
    ...remainingClauses.map((clause, index) =>
      e(DocumentPdfClause, {
        clause,
        index: index + 1,
        key: `${index + 1}-${clause}`,
      }),
    ),
  );
}

export function DocumentPdfClause({
  clause,
  index,
}: {
  clause: string;
  index: number;
}) {
  return e(
    View,
    { style: styles.clause, wrap: false },
    e(Text, { style: styles.clauseLabel }, `Cláusula ${index + 1}`),
    e(Text, { style: styles.clauseText }, clause),
  );
}
