import type { MarketplaceProvider } from "./types";

type MarketplaceProviderPresentation = {
  authorizationHint: string;
  channelType: string;
  description: string;
  previewLabel: string;
  readinessItems: readonly string[];
  runLabel: string;
};

export const marketplaceProviderPresentation: Record<
  MarketplaceProvider,
  MarketplaceProviderPresentation
> = {
  mercado_livre: {
    authorizationHint:
      "A autorização é feita na conta do Mercado Livre e retorna para esta tela.",
    channelType: "Catálogo e anúncio por item",
    description:
      "Vincula a FIPE aos atributos automotivos do Mercado Livre e controla cada anúncio publicado.",
    previewLabel: "Revisar catálogo",
    readinessItems: [
      "Categoria, marca, modelo, versão e ano",
      "Preço, fotos e ficha técnica",
      "Atualização e retirada por anúncio",
    ],
    runLabel: "Enviar ao Mercado Livre",
  },
  olx: {
    authorizationHint:
      "A conta OLX precisa ter o contrato de Autoupload habilitado para receber o estoque.",
    channelType: "Autoupload de classificados",
    description:
      "Envia o estoque em lote para a OLX e valida os dados comerciais exigidos para cada classificado.",
    previewLabel: "Validar lote",
    readinessItems: [
      "Conta e Autoupload habilitados",
      "Telefone e CEP da loja",
      "Placa válida para veículos usados",
    ],
    runLabel: "Enviar lote à OLX",
  },
};

export const marketplaceProviderOrder = [
  "mercado_livre",
  "olx",
] as const satisfies readonly MarketplaceProvider[];
