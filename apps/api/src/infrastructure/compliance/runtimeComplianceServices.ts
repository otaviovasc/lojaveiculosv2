import {
  createComplianceServices,
  type ComplianceServices,
} from "../../features/compliance/controllers/complianceServices.js";

export function createRuntimeComplianceServices(): ComplianceServices {
  return createComplianceServices({
    complianceRepository: {
      async getSnapshot(input) {
        return {
          controls: [
            control("access-review", "Revisao de acesso", "Owner", "attention"),
            control(
              "audit-export",
              "Exportacao de auditoria",
              "Agency",
              "attention",
            ),
            control(
              "secret-rotation",
              "Rotacao de segredos",
              "Platform",
              "attention",
            ),
            control(
              "provider-webhooks",
              "Assinatura de webhooks",
              "Platform",
              "blocked",
            ),
          ],
          generatedAt: new Date(),
          score: 0,
          storeId: input.storeId,
          summary: { attention: 3, blocked: 1, ok: 0 },
          tenantId: input.tenantId,
          workflows: [
            workflow("lgpd-export", "Exportar dados do titular", "attention"),
            workflow("lgpd-delete", "Anonimizar ou excluir dados", "attention"),
            workflow("retention", "Retencao documental", "attention"),
          ],
        };
      },
    },
  });
}

function control(
  key: string,
  title: string,
  owner: string,
  status: "attention" | "blocked",
) {
  return {
    description:
      "Controle pendente de adaptador persistente antes de producao.",
    key,
    owner,
    status,
    title,
  };
}

function workflow(key: string, title: string, status: "attention") {
  return {
    description: "Workflow precisa de persistencia e trilha operacional.",
    key,
    lastRunAt: null,
    nextDueAt: null,
    status,
    title,
  };
}
