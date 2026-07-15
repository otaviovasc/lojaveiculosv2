export function assertCommissionWorkspaceRange(input: {
  from: Date;
  to: Date;
}) {
  if (
    Number.isNaN(input.from.getTime()) ||
    Number.isNaN(input.to.getTime()) ||
    input.from > input.to
  ) {
    throw new CommissionWorkspaceValidationError("Invalid commission period.");
  }
  const maximumRangeMs = 366 * 24 * 60 * 60 * 1000;
  if (input.to.getTime() - input.from.getTime() > maximumRangeMs) {
    throw new CommissionWorkspaceValidationError(
      "Commission period cannot exceed 366 days.",
    );
  }
}

export class CommissionWorkspaceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommissionWorkspaceValidationError";
  }
}
