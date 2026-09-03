(async () => {
  const postgres = (await import("postgres")).default;
  const sql = postgres(process.env.DATABASE_PUBLIC_URL, {
    ssl: { rejectUnauthorized: false },
  });
  const cols =
    await sql`select column_name from information_schema.columns where table_name='crm_messages' order by ordinal_position`;
  console.log("cols:", cols.map((c) => c.column_name).join(","));
  await sql.end();
})().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
