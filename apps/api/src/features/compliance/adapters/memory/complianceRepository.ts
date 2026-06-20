import type {
  ComplianceControl,
  ComplianceRepository,
  ComplianceSnapshot,
  ComplianceWorkflow,
} from "../../../../domains/compliance/ports/complianceRepository.js";

export function createMemoryComplianceRepository(): ComplianceRepository {
  return {
    async getSnapshot(input): Promise<ComplianceSnapshot> {
      const controls = createControls();
      const workflows = createWorkflows();
      const summary = {
        attention: countStatus([...controls, ...workflows], "attention"),
        blocked: countStatus([...controls, ...workflows], "blocked"),
        ok: countStatus([...controls, ...workflows], "ok"),
      };

      return {
        controls,
        generatedAt: new Date(),
        score: Math.round(
          (summary.ok / (summary.ok + summary.attention + summary.blocked)) *
            100,
        ),
        storeId: input.storeId,
        summary,
        tenantId: input.tenantId,
        workflows,
      };
    },
  };
}

function createControls(): ComplianceControl[] {
  return [
    control("access-review", "Revisao de acesso", "Owner", "attention"),
    control("audit-export", "Exportacao de auditoria", "Agency admin", "ok"),
    control("secret-rotation", "Rotacao de segredos", "Platform", "attention"),
    control(
      "provider-webhooks",
      "Assinatura de webhooks",
      "Platform",
      "blocked",
    ),
  ];
}

function createWorkflows(): ComplianceWorkflow[] {
  return [
    workflow("lgpd-export", "Exportar dados do titular", "ok", 14),
    workflow("lgpd-delete", "Anonimizar ou excluir dados", "attention", 7),
    workflow("retention", "Retencao documental", "attention", 30),
  ];
}

function control(
  key: string,
  title: string,
  owner: string,
  status: ComplianceControl["status"],
): ComplianceControl {
  return {
    description: "Controle operacional auditavel para producao.",
    key,
    owner,
    status,
    title,
  };
}

function workflow(
  key: string,
  title: string,
  status: ComplianceWorkflow["status"],
  daysFromNow: number,
): ComplianceWorkflow {
  return {
    description: "Workflow documentado com trilha de auditoria obrigatoria.",
    key,
    lastRunAt: null,
    nextDueAt: new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000),
    status,
    title,
  };
}

function countStatus(
  items: readonly { status: ComplianceControl["status"] }[],
  status: ComplianceControl["status"],
) {
  return items.filter((item) => item.status === status).length;
}
