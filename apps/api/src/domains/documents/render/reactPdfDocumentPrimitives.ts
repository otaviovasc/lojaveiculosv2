import React from "react";
import {
  Document,
  Image,
  Page,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { styles } from "./reactPdfDocumentStyles.js";
import { formatCnpj, formatPhoneForPdf } from "./reactPdfFormatHelpers.js";

/** Single style object accepted by @react-pdf/renderer `style` props. */
export type PdfStyle = Exclude<
  NonNullable<React.ComponentProps<typeof View>["style"]>,
  unknown[]
>;

const e = React.createElement;

export const DocumentPdfRoot = Document;
export const DocumentPdfPage = Page;
export const DocumentPdfText = Text;
export const DocumentPdfView = View;
export const DocumentPdfImage = Image;

export async function renderDocumentPdf(
  document: React.ReactElement<React.ComponentProps<typeof Document>>,
): Promise<Uint8Array> {
  const buffer = await renderToBuffer(document);
  return new Uint8Array(buffer);
}

/* ---------- shared payload types ---------- */

export type PdfStoreInfo = {
  address?: string | undefined;
  city?: string | undefined;
  document?: string | undefined;
  instagram?: string | undefined;
  logoUrl?: string | undefined;
  name: string;
  phone?: string | undefined;
  state?: string | undefined;
};

export type PdfVehicleInfo = {
  brand?: string | undefined;
  chassi?: string | undefined;
  color?: string | undefined;
  fuel?: string | undefined;
  laudo?: string | undefined;
  manufactureYear?: number | string | undefined;
  model?: string | undefined;
  modelYear?: number | string | undefined;
  plate?: string | undefined;
  renavam?: string | undefined;
  title?: string | undefined;
  version?: string | undefined;
  km?: number | string | undefined;
};

export type PdfPaymentRow = {
  date?: string | undefined;
  description?: string | undefined;
  method: string;
  valueCents: number;
};

export type PdfSignatureInfo = {
  highlightText?: string | undefined;
  name: string;
  role?: string | undefined;
};

/* ---------- shared building blocks ---------- */

export function PdfLogo({ src }: { src?: string | undefined }) {
  if (!src) return null;
  return e(
    View,
    { style: styles.logoContainer },
    e(Image, { src, style: styles.logo }),
  );
}

/** Logo image, or a styled store name when the store has no logo. */
export function PdfLogoOrName({
  logoUrl,
  storeName,
}: {
  logoUrl?: string | undefined;
  storeName: string;
}) {
  if (logoUrl) return e(PdfLogo, { src: logoUrl });
  return e(
    View,
    { style: styles.logoContainer },
    e(Text, { style: [styles.storeName, { fontSize: 14 }] }, storeName),
  );
}

/** Premium fixed header: centered logo, store info left, doc title right. */
export function PdfPremiumHeader({
  store,
  subtitle,
  title,
}: {
  store: PdfStoreInfo;
  subtitle: string;
  title: string;
}) {
  return e(
    View,
    { fixed: true, style: styles.header },
    e(View, { style: styles.headerTop }, e(PdfLogo, { src: store.logoUrl })),
    e(
      View,
      { style: styles.headerBottom },
      e(
        View,
        { style: styles.headerLeft },
        e(Text, { style: styles.storeName }, store.name),
        store.document
          ? e(
              Text,
              { style: styles.storeDetail },
              `CNPJ: ${formatCnpj(store.document)}`,
            )
          : null,
        store.address
          ? e(Text, { style: styles.storeDetail }, store.address)
          : null,
        store.phone
          ? e(
              Text,
              { style: styles.storeDetail },
              `WhatsApp: ${formatPhoneForPdf(store.phone)}`,
            )
          : null,
        store.instagram
          ? e(
              Text,
              { style: styles.storeDetail },
              `Instagram: ${store.instagram}`,
            )
          : null,
      ),
      e(
        View,
        { style: styles.headerRight },
        e(Text, { style: styles.docTitle }, title),
        e(Text, { style: styles.docSubtitle }, subtitle),
      ),
    ),
  );
}

export function PdfSectionTitle({ title }: { title: string }) {
  return e(Text, { style: styles.sectionTitle }, title);
}

/** Fixed footer: contact line left, "Página X de Y" right. */
export function PdfPageFooter({ contactLine }: { contactLine?: string }) {
  return e(
    View,
    { fixed: true, style: styles.footer },
    e(Text, { style: styles.footerContactText }, contactLine ?? ""),
    e(Text, {
      fixed: true,
      render: ({ pageNumber, totalPages }) =>
        `Página ${pageNumber} de ${totalPages}`,
      style: styles.footerPageNumber,
    }),
  );
}

/** Fixed "RUBRICA DO COMPRADOR" line rendered on every contract page. */
export function PdfRubricaLine() {
  return e(
    View,
    { fixed: true, style: styles.rubricaFixed },
    e(View, { style: styles.rubricaLine }),
    e(Text, { style: styles.rubricaText }, "Rubrica do Comprador"),
  );
}

export * from "./reactPdfFormatHelpers.js";
export * from "./reactPdfDocumentBlocks.js";
export * from "./reactPdfPaymentTables.js";
