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

export async function renderSharedDocumentPdf(
  document: SharedPdfDocument,
): Promise<Uint8Array> {
  const buffer = await renderToBuffer(createSharedPdfDocument(document));
  return new Uint8Array(buffer);
}

export function createSharedPdfDocument(document: SharedPdfDocument) {
  return e(
    Document,
    null,
    e(
      Page,
      { size: "A4", style: styles.page },
      e(DocumentPdfHeader, {
        brand: document.brand,
        subtitle: document.subtitle,
        title: document.title,
      }),
      e(DocumentPdfFooter, null),
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
      e(Text, { style: styles.muted }, brand.storeDocument ?? ""),
      e(Text, { style: styles.muted }, brand.contactLine ?? ""),
    ),
    e(
      View,
      { style: styles.documentTitle },
      e(Text, { style: styles.title }, title),
      e(Text, { style: styles.muted }, subtitle),
    ),
  );
}

export function DocumentPdfFooter() {
  return e(
    View,
    { fixed: true, style: styles.footer },
    e(Text, { style: styles.muted }, "Documento gerado pelo Loja Veiculos"),
    e(Text, {
      render: ({ pageNumber, totalPages }) =>
        `Pagina ${pageNumber} de ${totalPages}`,
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
    e(DocumentPdfClauses, { clauses: document.clauses }),
    document.audit
      ? e(DocumentPdfSection, { section: document.audit, compact: true })
      : null,
    e(DocumentPdfSignatures, { signatures: document.signatures }),
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

function DocumentPdfClauses({ clauses }: { clauses: readonly string[] }) {
  return e(
    View,
    { style: styles.section },
    e(Text, { style: styles.sectionTitle }, "Clausulas"),
    ...clauses.map((clause, index) =>
      e(
        View,
        { key: `${index}-${clause}`, style: styles.clause },
        e(Text, { style: styles.clauseLabel }, `Clausula ${index + 1}`),
        e(Text, { style: styles.clauseText }, clause),
      ),
    ),
  );
}
