import {
  Activity,
  Bot,
  CircleDollarSign,
  Clock3,
  MessagesSquare,
  Target,
} from "lucide-react";
import type { ComponentType } from "react";

export type DashboardStat = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  tone: "green" | "blue" | "violet" | "pink";
  value: string;
};

export const dashboardStats: DashboardStat[] = [
  {
    icon: CircleDollarSign,
    label: "Faturamento",
    tone: "green",
    value: "R$ 0",
  },
  {
    icon: Target,
    label: "Ticket medio",
    tone: "blue",
    value: "R$ 0",
  },
  {
    icon: Activity,
    label: "Conversao",
    tone: "violet",
    value: "0%",
  },
  {
    icon: Bot,
    label: "Leads IA",
    tone: "pink",
    value: "0",
  },
];

export const dashboardPanels = [
  {
    icon: Clock3,
    label: "Maior tempo em estoque",
    text: "Preparado para receber metricas de giro assim que inventory service existir.",
  },
  {
    icon: MessagesSquare,
    label: "Atendimento pendente",
    text: "Preparado para consumir o CRM sem iframe via repasses backend.",
  },
];
