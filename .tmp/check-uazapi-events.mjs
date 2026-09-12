(async () => {
  const postgres = (await import("postgres")).default;
  const sql = postgres(process.env.DATABASE_PUBLIC_URL, {
    ssl: { rejectUnauthorized: false },
  });
  const a =
    await sql`select status, count(*)::int c, max(created_at) last from provider_events where provider = 'uazapi' and created_at > now() - interval '6 hours' group by status order by c desc`;
  console.log("uazapi 6h:", JSON.stringify(a));
  const b =
    await sql`select event_type, status, count(*)::int c, max(created_at) last from provider_events where provider = 'uazapi' and created_at > now() - interval '6 hours' group by 1,2 order by 1,2`;
  console.log("by type:", JSON.stringify(b));
  const c =
    await sql`select id, direction, created_at, sender_type from crm_messages where connection_id = '6977dc7f-f862-4199-b77d-fa313d22ff95' and created_at > now() - interval '12 hours' order by created_at desc limit 10`;
  console.log("msgs uazapi 12h:", JSON.stringify(c));
  const d =
    await sql`select date_trunc('hour', created_at) h, status, count(*)::int c from provider_events where provider='uazapi' and created_at > now() - interval '24 hours' group by 1,2 order by 1 desc limit 40`;
  console.log("hourly 24h:", JSON.stringify(d));
  await sql.end();
})().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
