import type { DocumentStatus } from "../ports/documentRepository.js";

const TRANSITION_MAP: Record<DocumentStatus, readonly DocumentStatus[]> = {
  draft: ["pending_signature", "issued", "voided", "archived"],
  pending_signature: ["signed", "voided"],
  signed: ["issued", "voided"],
  issued: ["voided", "archived"],
  voided: [],
  archived: [],
};

const TERMINAL_STATUSES = new Set<DocumentStatus>(["voided", "archived"]);

export class DocumentWorkflowPolicyError extends Error {
  constructor(
    public readonly from: DocumentStatus,
    public readonly to: DocumentStatus,
    action: string,
  ) {
    super(`Cannot transition document from ${from} to ${to} during ${action}.`);
    this.name = "DocumentWorkflowPolicyError";
  }
}

export function canTransition(
  from: DocumentStatus,
  to: DocumentStatus,
): boolean {
  return (TRANSITION_MAP[from] as readonly string[]).includes(to);
}

export function assertCanTransition(
  from: DocumentStatus,
  to: DocumentStatus,
  action: string,
): void {
  if (!canTransition(from, to)) {
    throw new DocumentWorkflowPolicyError(from, to, action);
  }
}

export function isTerminal(status: DocumentStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}
