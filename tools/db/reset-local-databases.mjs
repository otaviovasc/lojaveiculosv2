import { resetLocalDatabases } from "./reset-local-databases-core.mjs";

try {
  resetLocalDatabases();
  console.log("Local databases reset and seeded.");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
