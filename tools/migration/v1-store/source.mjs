import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import postgres from "postgres";

const CONTAINER_NAME = `lojaveiculos-v1-store-import-${process.pid}`;
const SOURCE_PASSWORD = "temporary_v1_import_only";

function docker(...args) {
  return execFileSync("docker", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

export async function withV1Archive(archivePath, callback) {
  if (!existsSync(archivePath))
    throw new Error(`V1 archive not found: ${archivePath}`);
  docker(
    "run",
    "--rm",
    "-d",
    "--name",
    CONTAINER_NAME,
    "--mount",
    `type=bind,source=${archivePath},target=/v1-archive,readonly`,
    "-e",
    `POSTGRES_PASSWORD=${SOURCE_PASSWORD}`,
    "-p",
    "127.0.0.1::5432",
    "postgres:17-alpine",
  );
  try {
    docker(
      "exec",
      CONTAINER_NAME,
      "sh",
      "-lc",
      "until pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done",
    );
    docker("exec", CONTAINER_NAME, "createdb", "-U", "postgres", "v1_import");
    docker(
      "exec",
      CONTAINER_NAME,
      "pg_restore",
      "-U",
      "postgres",
      "-d",
      "v1_import",
      "--no-owner",
      "--no-privileges",
      "/v1-archive",
    );
    const port = docker("port", CONTAINER_NAME, "5432/tcp").split(":").at(-1);
    const sql = postgres(
      `postgresql://postgres:${SOURCE_PASSWORD}@127.0.0.1:${port}/v1_import`,
      { max: 2 },
    );
    try {
      return await callback(sql);
    } finally {
      await sql.end();
    }
  } finally {
    try {
      docker("stop", CONTAINER_NAME);
    } catch {}
  }
}

export async function loadStoreData(sql, storeId) {
  const one = async (query) => (await sql.unsafe(query, [storeId]))[0] ?? null;
  const many = (query) => sql.unsafe(query, [storeId]);
  const store = await one('SELECT * FROM "Loja" WHERE id = $1');
  if (!store) throw new Error(`V1 Loja ${storeId} does not exist.`);
  const data = {
    store,
    settings: await one('SELECT * FROM "Settings" WHERE "lojaId" = $1'),
    accesses: await many(
      'SELECT a.*, row_to_json(u.*) AS profile FROM "LojaAccess" a LEFT JOIN "UserProfile" u ON u."clerkUserId"=a."clerkUserId" WHERE a."lojaId"=$1 ORDER BY a.id',
    ),
    vehicles: await many(
      'SELECT v.*, row_to_json(m.*) AS brand, row_to_json(md.*) AS model FROM "Veiculo" v LEFT JOIN "Marca" m ON m.id=v."marcaId" LEFT JOIN "Modelo" md ON md.id=v."modeloId" WHERE v."lojaId"=$1 ORDER BY v.id',
    ),
    customModels: await many(
      'SELECT * FROM "Modelo" WHERE "lojaId"=$1 ORDER BY id',
    ),
    photos: await many(
      'SELECT f.* FROM "FotosVeiculo" f JOIN "Veiculo" v ON v.id=f."veiculoId" WHERE v."lojaId"=$1 ORDER BY f."veiculoId",f.ordem,f.id',
    ),
    checklists: await many(
      'SELECT c.* FROM "VehicleChecklist" c WHERE c."lojaId"=$1 ORDER BY c.id',
    ),
    columns: await many(
      'SELECT * FROM "LeadColumn" WHERE "lojaId"=$1 ORDER BY position,id',
    ),
    leads: await many('SELECT * FROM "Lead" WHERE "lojaId"=$1 ORDER BY id'),
    interactions: await many(
      'SELECT x.* FROM "LeadInteraction" x JOIN "Lead" l ON l.id=x."leadId" WHERE l."lojaId"=$1 ORDER BY x.id',
    ),
    tasks: await many(
      'SELECT x.* FROM "LeadTask" x JOIN "Lead" l ON l.id=x."leadId" WHERE l."lojaId"=$1 ORDER BY x.id',
    ),
    interests: await many(
      'SELECT x.* FROM "LeadInterestedVehicle" x JOIN "Lead" l ON l.id=x."leadId" WHERE l."lojaId"=$1 ORDER BY x.id',
    ),
    saleSources: await many(
      'SELECT * FROM "SaleSource" WHERE "lojaId"=$1 ORDER BY id',
    ),
    sales: await many('SELECT * FROM "Sale" WHERE "lojaId"=$1 ORDER BY id'),
    salePayments: await many(
      'SELECT p.* FROM "SalePayment" p JOIN "Sale" s ON s.id=p."saleId" WHERE s."lojaId"=$1 ORDER BY p.id',
    ),
    recurringEntries: await many(
      'SELECT * FROM "RecurringEntry" WHERE "lojaId"=$1 ORDER BY id',
    ),
    entries: await many('SELECT * FROM "Entry" WHERE "lojaId"=$1 ORDER BY id'),
    documents: await many(
      'SELECT * FROM "Document" WHERE "lojaId"=$1 ORDER BY id',
    ),
    testDrives: await many(
      'SELECT * FROM "TestDrive" WHERE "lojaId"=$1 ORDER BY id',
    ),
    recipients: await many(
      'SELECT * FROM "ServiceRecipient" WHERE "lojaId"=$1 ORDER BY id',
    ),
    fiscalDocuments: await many(
      'SELECT * FROM "FiscalDocument" WHERE "lojaId"=$1 ORDER BY id',
    ),
  };
  await assertUnsupportedTablesEmpty(sql, storeId);
  return data;
}

async function assertUnsupportedTablesEmpty(sql, storeId) {
  const tables = [
    "Depoimento",
    "PartnerStore",
    "Investor",
    "VehicleConsignment",
  ];
  const unresolved = [];
  for (const table of tables) {
    const [row] = await sql.unsafe(
      `SELECT count(*)::int AS count FROM "${table}" WHERE "lojaId"=$1`,
      [storeId],
    );
    if (row.count) unresolved.push(`${table}=${row.count}`);
  }
  if (unresolved.length)
    throw new Error(
      `Decision required for unsupported V1 records: ${unresolved.join(", ")}`,
    );
}
