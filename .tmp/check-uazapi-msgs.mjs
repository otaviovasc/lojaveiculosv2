(async () => {
  const postgres = (await import("postgres")).default;
  const sql = postgres(process.env.DATABASE_PUBLIC_URL, {
    ssl: { rejectUnauthorized: false },
  });
  const c =
    await sql`select id, direction, occurred_at, sender, status, left(content,40) content from crm_messages where provider_connection_id = '6977dc7f-f862-4199-b77d-fa313d22ff95' and occurred_at > now() - interval '24 hours' order by occurred_at desc limit 15`;
  console.log("msgs uazapi 24h:", JSON.stringify(c, null, 1));
  const e =
    await sql`select direction, count(*)::int c from crm_messages where provider_connection_id='6977dc7f-f862-4199-b77d-fa313d22ff95' group by 1`;
  console.log("totals:", JSON.stringify(e));
  await sql.end();
})().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
