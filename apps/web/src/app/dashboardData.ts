import { Clock3, MessagesSquare } from "lucide-react";
import { fallbackDashboardStats } from "../features/analytics/dashboardModel";
import type { DashboardStatViewModel } from "../features/analytics/types";

export type DashboardStat = DashboardStatViewModel;

export const dashboardStats: DashboardStat[] = fallbackDashboardStats;

export const dashboardPanels = [
  {
    icon: Clock3,
    label: "Maior tempo em estoque",
    text: "Preparado para receber metricas de giro do estoque.",
  },
  {
    icon: MessagesSquare,
    label: "Atendimento pendente",
    text: "Preparado para acompanhar conversas e oportunidades em aberto.",
  },
];
