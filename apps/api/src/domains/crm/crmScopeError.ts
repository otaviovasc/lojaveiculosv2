export class CrmScopeError extends Error {
  constructor(fieldName: string) {
    super(`CRM service requires ${fieldName}.`);
    this.name = "CrmScopeError";
  }
}
