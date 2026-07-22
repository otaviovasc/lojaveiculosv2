import React from "react";
import { styles } from "../../documents/render/reactPdfDocumentStyles.js";
import {
  DocumentPdfPage,
  DocumentPdfRoot,
  DocumentPdfText as Text,
  DocumentPdfView as View,
  PdfLogo,
  formatBuyerDocument,
  formatCnpj,
  formatPhoneForPdf,
} from "../../documents/render/reactPdfDocumentPrimitives.js";
import { powerOfAttorneyFallbackPowers } from "./vehicleWorkflowFallbackClauses.js";
import { procuracaoStyles } from "./vehicleProcuracaoPdfStyles.js";
import { renderProcuracaoSignatureSection } from "./vehiclePowerOfAttorneyPdfSections.js";
import type { WorkflowPdfModel } from "./vehicleWorkflowPdfModel.js";

const e = React.createElement;

export function createPowerOfAttorneyDocument(model: WorkflowPdfModel) {
  const { buyer, store } = model;
  const vehicle = model.tradeInVehicle ?? model.vehicle;
  const location = [buyer.city ?? store.city, buyer.state ?? store.state]
    .filter(Boolean)
    .join(" – ");
  const powers = model.clauses.length
    ? model.clauses
    : powerOfAttorneyFallbackPowers;

  return e(
    DocumentPdfRoot,
    {
      author: store.name,
      creator: "Loja Veículos OS",
      language: "pt-BR",
      producer: "Loja Veículos OS",
      subject: model.title,
      title: model.title,
    },
    e(
      DocumentPdfPage,
      {
        size: "A4",
        style: [styles.pageForm, { fontSize: 10, lineHeight: 1.3 }],
      },
      e(
        View,
        { fixed: true, style: procuracaoStyles.header },
        e(
          View,
          { style: procuracaoStyles.headerTop },
          e(PdfLogo, { src: store.logoUrl }),
        ),
        e(
          View,
          { style: procuracaoStyles.headerBottom },
          e(
            View,
            { style: procuracaoStyles.storeInfo },
            e(Text, { style: procuracaoStyles.storeName }, store.name),
            store.address
              ? e(Text, { style: procuracaoStyles.storeDetail }, store.address)
              : null,
            store.document
              ? e(
                  Text,
                  { style: procuracaoStyles.storeDetail },
                  `CNPJ: ${formatCnpj(store.document)}`,
                )
              : null,
            store.phone
              ? e(
                  Text,
                  { style: procuracaoStyles.storeDetail },
                  `Tel: ${formatPhoneForPdf(store.phone)}`,
                )
              : null,
          ),
        ),
      ),
      e(
        View,
        { style: procuracaoStyles.titleSection },
        e(
          Text,
          { style: procuracaoStyles.mainTitle },
          "PROCURAÇÃO ESPECÍFICA PARA VENDA DE VEÍCULO",
        ),
      ),
      e(
        View,
        { style: procuracaoStyles.section },
        e(Text, { style: procuracaoStyles.sectionTitle }, "OUTORGANTE:"),
        e(
          Text,
          { style: procuracaoStyles.paragraph },
          e(Text, { style: styles.bold }, buyer.name),
          `, ${buyer.nationality ?? "[NACIONALIDADE]"}, ${buyer.maritalStatus ?? "[ESTADO CIVIL]"}, ${buyer.profession ?? "[PROFISSÃO]"}`,
          `, inscrito(a) no ${buyer.documentLabel} sob o nº ${formatBuyerDocument(buyer.document) || "[Número]"}`,
          buyer.address
            ? `, residente e domiciliado(a) na ${buyer.address}.`
            : ".",
        ),
      ),
      e(
        View,
        { style: procuracaoStyles.section },
        e(Text, { style: procuracaoStyles.sectionTitle }, "OUTORGADO:"),
        e(
          Text,
          { style: procuracaoStyles.paragraph },
          e(Text, { style: styles.bold }, store.name),
          ", pessoa jurídica de direito privado",
          store.document
            ? `, inscrita no CNPJ sob o nº ${formatCnpj(store.document)}`
            : "",
          store.address ? `, com sede na ${store.address}` : "",
          store.city || store.state
            ? `, ${store.city ?? "[Cidade]"} – ${store.state ?? "[Estado]"}`
            : "",
          ", neste ato representada por seus procuradores ou sócios devidamente constituídos.",
        ),
      ),
      e(
        View,
        { style: procuracaoStyles.section },
        e(
          Text,
          { style: procuracaoStyles.sectionTitle },
          "OBJETO E FINALIDADE:",
        ),
        e(
          Text,
          { style: procuracaoStyles.paragraph },
          "A presente procuração destina-se exclusivamente à representação e prática de atos relativos ao veículo abaixo descrito, de propriedade do OUTORGANTE:",
        ),
        e(
          View,
          { style: procuracaoStyles.vehicleBox },
          vehicleRow(
            "Marca/Modelo:",
            [vehicle.brand, vehicle.model, vehicle.version]
              .filter(Boolean)
              .join(" ") ||
              vehicle.title ||
              "-",
          ),
          vehicleRow(
            "Ano:",
            `${vehicle.manufactureYear ?? "----"}/${vehicle.modelYear ?? "----"}`,
          ),
          vehicleRow("Placa:", vehicle.plate ?? "[Placa]"),
          vehicleRow("Chassi:", vehicle.chassi ?? "[Chassi]"),
          vehicleRow("Renavam:", vehicle.renavam ?? "[Renavam]"),
        ),
      ),
      e(
        View,
        { style: procuracaoStyles.section },
        e(Text, { style: procuracaoStyles.sectionTitle }, "PODERES:"),
        e(
          Text,
          { style: procuracaoStyles.paragraph },
          e(
            Text,
            { style: styles.bold },
            "Pelo presente instrumento, o OUTORGANTE confere à OUTORGADA",
          ),
          " poderes especiais para representá-lo perante os órgãos de trânsito (DETRAN, CIRETRAN, CONTRAN), repartições públicas federais, estaduais e municipais, podendo:",
        ),
        ...powers.map((power, index) =>
          e(
            Text,
            { key: index, style: procuracaoStyles.listItem },
            `• ${power}`,
          ),
        ),
      ),
      e(
        View,
        { style: procuracaoStyles.section },
        e(Text, { style: procuracaoStyles.sectionTitle }, "VEDAÇÕES:"),
        e(
          Text,
          { style: procuracaoStyles.paragraph },
          "É vedado à outorgada o substabelecimento destes poderes a terceiros alheios ao seu quadro diretivo ou operacional, bem como a utilização desta procuração para qualquer outro fim que não seja o veículo acima descrito.",
        ),
      ),
      e(
        View,
        { style: procuracaoStyles.section },
        e(Text, { style: procuracaoStyles.sectionTitle }, "VALIDADE:"),
        e(
          Text,
          { style: procuracaoStyles.paragraph },
          "Esta procuração tem validade até a venda do veículo citado acima.",
        ),
      ),
      renderProcuracaoSignatureSection(model, location),
      e(
        View,
        { fixed: true, style: procuracaoStyles.footer },
        e(
          Text,
          { style: procuracaoStyles.footerText },
          `${store.name}${store.address ? ` - ${store.address}` : ""}`,
        ),
        e(Text, {
          fixed: true,
          render: ({ pageNumber, totalPages }) =>
            `${pageNumber} / ${totalPages}`,
          style: procuracaoStyles.footerText,
        }),
      ),
    ),
  );
}

function vehicleRow(label: string, value: string) {
  return e(
    View,
    { key: label, style: procuracaoStyles.vehicleRow },
    e(Text, { style: procuracaoStyles.vehicleLabel }, label),
    e(Text, { style: procuracaoStyles.vehicleValue }, value),
  );
}
