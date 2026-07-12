import type { RoleKey } from "./types";

const fallbackRoleLabels: Record<RoleKey, string> = {
  admin: "Administrador da plataforma",
  agency: "Gestor da agência",
  investor: "Investidor",
  owner: "Proprietário",
  salesman: "Vendedor",
  supervisor: "Supervisor",
};

const domainStatusLabels: Record<string, string> = {
  failed: "Falha na configuração",
  not_configured: "Não configurado",
  pending: "Aguardando verificação",
  verified: "Verificado",
};

export function getRoleLabel(role: RoleKey) {
  return fallbackRoleLabels[role];
}

export function getDomainStatusLabel(status: string) {
  return domainStatusLabels[status] ?? "Status indisponível";
}
