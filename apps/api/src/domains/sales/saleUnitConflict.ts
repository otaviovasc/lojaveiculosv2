export const activeSaleUnitConstraintName = "sales_current_unit_unique";

export class SaleUnitConflictError extends Error {
  constructor() {
    super("Vehicle unit already has a current sale.");
    this.name = "SaleUnitConflictError";
  }
}
