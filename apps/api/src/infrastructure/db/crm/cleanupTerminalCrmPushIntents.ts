import { sql } from "drizzle-orm";
import type { DrizzleCrmClient } from "./drizzleCrmRepository.js";
import { asCrmPushRawRows } from "./drizzleCrmPushSupport.js";

export async function cleanupTerminalCrmPushIntents(
  db: DrizzleCrmClient,
  input: { cutoff: Date; limit: number },
): Promise<number> {
  const cutoff = input.cutoff.toISOString();
  const rows = await db.execute(sql`
    delete from crm_push_notification_outbox
    where id in (
      select id
      from crm_push_notification_outbox
      where (
        state = 'delivered' and delivered_at < ${cutoff}
      ) or (
        state = 'dead_letter' and dead_lettered_at < ${cutoff}
      )
      order by coalesce(delivered_at, dead_lettered_at), id
      for update skip locked
      limit ${input.limit}
    )
    returning id
  `);
  return asCrmPushRawRows(rows).length;
}
