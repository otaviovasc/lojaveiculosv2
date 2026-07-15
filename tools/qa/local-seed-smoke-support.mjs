export const seedIds = Object.freeze({
  branchStore: "66666666-6666-4666-8666-666666666667",
  foreignStore: "66666666-6666-4666-8666-666666666668",
  foreignTenant: "77777777-7777-4777-8777-777777777778",
  primaryStore: "66666666-6666-4666-8666-666666666666",
  primaryTenant: "77777777-7777-4777-8777-777777777777",
  zapiConnection: "24000000-0000-4000-8000-000000000101",
});

export const seededTenantIds = [seedIds.primaryTenant, seedIds.foreignTenant];

export function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function byKey(rows, key) {
  return Object.fromEntries(rows.map((row) => [row[key], row]));
}

export function assertCount(row, key, expected, label) {
  assert(
    row?.[key] === expected,
    `${label}: expected ${expected}, received ${String(row?.[key])}.`,
  );
}
