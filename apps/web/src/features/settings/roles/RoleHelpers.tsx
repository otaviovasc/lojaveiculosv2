import type { RoleKey } from "../types";
import { Car, MessageSquare, Coins, Sliders } from "lucide-react";

export type CustomRolePreset = {
  id: string;
  name: string;
  baseRole: RoleKey;
  overrides: { permission: string; allowed: boolean }[];
};

export const featureBlocks = [
  {
    key: "inventory_marketplace",
    title: "Estoque, Portais e Anúncios",
    description:
      "Controle de veículos, checklists, vistorias e publicação em portais (OLX, Mercado Livre).",
    icon: Car,
    groups: ["inventory", "marketplace"],
  },
  {
    key: "sales_crm",
    title: "Vendas, Propostas e Atendimento (CRM)",
    description:
      "Visualização de vendas, criação de propostas, chats e interações de WhatsApp.",
    icon: MessageSquare,
    groups: ["sales", "crm"],
  },
  {
    key: "finance_docs",
    title: "Financeiro, Recibos e Contratos",
    description:
      "Lançamento de movimentações, fluxo de caixa e emissão de contratos ou termos em PDF.",
    icon: Coins,
    groups: ["finance", "documents"],
  },
  {
    key: "admin_platform",
    title: "Administração e Configurações Gerais",
    description:
      "Cadastro da empresa, gerenciamento da equipe, segurança, faturamento e integrações de API.",
    icon: Sliders,
    groups: ["storefront", "platform"],
  },
];
