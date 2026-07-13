type PostgresConstraintErrorInput = {
  code: string;
  constraintName: string;
};

export function isPostgresConstraintError(
  error: unknown,
  input: PostgresConstraintErrorInput,
): boolean {
  const seen = new Set<unknown>();
  let candidate = error;

  while (candidate && typeof candidate === "object" && !seen.has(candidate)) {
    seen.add(candidate);
    const record = candidate as Record<string, unknown>;
    const constraintName =
      readString(record.constraint_name) ?? readString(record.constraint);

    if (record.code === input.code && constraintName === input.constraintName) {
      return true;
    }
    candidate = record.cause;
  }

  return false;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
