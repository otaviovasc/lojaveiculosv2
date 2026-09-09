#!/usr/bin/env node
// One-off cleanup: merges duplicate WhatsApp conversation threads that were
// created before phone-identity normalization (uazapi inbound keyed by LID /
// "+55..." phone vs fromMe echoes keyed by bare digits without chat id).
//
// Threads on the same connection are grouped when their customer phones match
// under digit normalization, country-code toggle, and the Brazilian ninth
// digit, or when their chat ids carry the same digits. The earliest thread in
// each group is canonical: messages and cycle-level references move into its
// active cycle, stray attendance state rows are dropped, thread-level
// references are re-pointed, and the stray cycles are completed while stray
// threads are archived (attendance events are append-only, so stray rows
// remain as dormant husks that no listing surfaces).
//
// Usage:
//   DATABASE_URL=postgresql://... node tools/db/merge-duplicate-crm-whatsapp-threads.mjs
//   DATABASE_URL=postgresql://... node tools/db/merge-duplicate-crm-whatsapp-threads.mjs --apply
//
// Without --apply the script only reports the groups and row counts it would
// change. Reuses the existing DATABASE_URL env var (see docs/ops/env-vars.md).
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}
const apply = process.argv.includes("--apply");

const CYCLE_MOVE_TABLES = [
  "crm_messages",
  "crm_appointments",
  "crm_tasks",
  "crm_scheduled_messages",
  "crm_outbound_intents",
  "crm_push_notification_outbox",
  "crm_webhook_effect_outbox",
  "crm_conversation_command_receipts",
];
const CYCLE_DELETE_TABLES = ["crm_conversation_attendances"];
const THREAD_MOVE_TABLES = [
  "crm_campaign_recipients",
  "acquisition_touchpoints",
  "crm_external_bot_event_outbox",
  "crm_external_bot_grants",
  "crm_external_bot_action_commands",
];

const sql = postgres(databaseUrl, { max: 1, prepare: false });

function digits(value) {
  return (value ?? "").replace(/\D/g, "");
}

// Mirrors apps/api/src/domains/crm/whatsapp/whatsappPhone.ts.
function phoneCandidates(value) {
  const raw = digits(value);
  if (!raw) return [];
  const candidates = new Set([raw]);
  const national =
    raw.startsWith("55") && (raw.length === 12 || raw.length === 13)
      ? raw.slice(2)
      : raw;
  const nationalVariants = new Set([national]);
  if (national.length === 11 && national[2] === "9") {
    nationalVariants.add(national.slice(0, 2) + national.slice(3));
  }
  if (national.length === 10 && /^[6-9]$/.test(national[2] ?? "")) {
    nationalVariants.add(`${national.slice(0, 2)}9${national.slice(2)}`);
  }
  for (const variant of nationalVariants) {
    if (variant.length === 10 || variant.length === 11) {
      candidates.add(variant);
      candidates.add(`55${variant}`);
    }
  }
  return [...candidates];
}

function groupKeyCandidates(thread) {
  const keys = phoneCandidates(thread.customer_phone).map(
    (phone) => `phone:${phone}`,
  );
  const chatDigits = digits(
    (thread.customer_chat_id ?? "").replace(/@lid$/iu, ""),
  );
  if (chatDigits) keys.push(`chat:${chatDigits}`);
  return keys;
}

function buildDuplicateGroups(threads) {
  const byConnection = new Map();
  for (const thread of threads) {
    const list = byConnection.get(thread.provider_connection_id) ?? [];
    list.push(thread);
    byConnection.set(thread.provider_connection_id, list);
  }
  const groups = [];
  for (const list of byConnection.values()) {
    const parent = new Map(list.map((thread) => [thread.id, thread.id]));
    const find = (id) => {
      while (parent.get(id) !== id) {
        parent.set(id, parent.get(parent.get(id)));
        id = parent.get(id);
      }
      return id;
    };
    const union = (a, b) => parent.set(find(a), find(b));
    const keyOwner = new Map();
    for (const thread of list) {
      for (const key of groupKeyCandidates(thread)) {
        const owner = keyOwner.get(key);
        if (owner) union(owner, thread.id);
        else keyOwner.set(key, thread.id);
      }
    }
    const buckets = new Map();
    for (const thread of list) {
      const root = find(thread.id);
      const bucket = buckets.get(root) ?? [];
      bucket.push(thread);
      buckets.set(root, bucket);
    }
    for (const bucket of buckets.values()) {
      if (bucket.length > 1) {
        bucket.sort(
          (left, right) =>
            new Date(left.created_at) - new Date(right.created_at),
        );
        groups.push(bucket);
      }
    }
  }
  return groups;
}

async function mergeGroup(group) {
  const [canonical, ...strays] = group;
  const strayIds = strays.map((thread) => thread.id);
  const [canonicalCycle] = await sql`
    SELECT id FROM crm_conversation_cycles
    WHERE thread_id = ${canonical.id}
    ORDER BY (state = 'active') DESC, updated_at DESC
    LIMIT 1
  `;
  if (!canonicalCycle) {
    console.log(
      `  skip ${canonical.id}: canonical thread has no cycle to absorb into`,
    );
    return;
  }
  const strayCycles = await sql`
    SELECT id FROM crm_conversation_cycles WHERE thread_id = ANY(${strayIds})
  `;
  const strayCycleIds = strayCycles.map((cycle) => cycle.id);

  const blocked = await sql`
    SELECT COUNT(*)::int AS n FROM crm_lead_outcomes
    WHERE origin_cycle_id = ANY(${strayCycleIds})
  `;
  if (blocked[0].n > 0) {
    console.log(
      `  skip ${canonical.id}: ${blocked[0].n} lead outcome(s) reference stray cycles; merge manually`,
    );
    return;
  }

  const run = async (tx) => {
    for (const table of CYCLE_MOVE_TABLES) {
      await tx.unsafe(
        `UPDATE ${table} SET cycle_id = $1, thread_id = $2, updated_at = now()
         WHERE cycle_id = ANY($3)`,
        [canonicalCycle.id, canonical.id, strayCycleIds],
      );
    }
    for (const table of CYCLE_DELETE_TABLES) {
      await tx.unsafe(`DELETE FROM ${table} WHERE cycle_id = ANY($1)`, [
        strayCycleIds,
      ]);
    }
    for (const table of THREAD_MOVE_TABLES) {
      await tx.unsafe(
        `UPDATE ${table} SET thread_id = $1 WHERE thread_id = ANY($2)`,
        [canonical.id, strayIds],
      );
    }
    // Attendance events are append-only, so stray cycles and threads cannot
    // be hard-deleted; they are completed and archived into dormant husks
    // that no listing surfaces.
    await tx`
      UPDATE crm_conversation_cycles
      SET state = 'completed',
          closed_at = coalesce(closed_at, now()),
          archived_at = coalesce(archived_at, now()),
          revision = revision + 1,
          updated_at = now()
      WHERE id = ANY(${strayCycleIds})
    `;
    await tx`
      UPDATE crm_conversation_threads
      SET state = 'archived', revision = revision + 1, updated_at = now()
      WHERE id = ANY(${strayIds})
    `;
    await tx`
      UPDATE crm_conversation_threads
      SET customer_chat_id = coalesce(
            customer_chat_id,
            (SELECT customer_chat_id FROM crm_conversation_threads
             WHERE id = ANY(${strayIds}) AND customer_chat_id IS NOT NULL
             ORDER BY created_at LIMIT 1)
          ),
          customer_display_name = coalesce(
            customer_display_name,
            (SELECT customer_display_name FROM crm_conversation_threads
             WHERE id = ANY(${strayIds}) AND customer_display_name IS NOT NULL
             ORDER BY created_at LIMIT 1)
          ),
          profile_photo_url = coalesce(
            profile_photo_url,
            (SELECT profile_photo_url FROM crm_conversation_threads
             WHERE id = ANY(${strayIds}) AND profile_photo_url IS NOT NULL
             ORDER BY created_at LIMIT 1)
          ),
          revision = revision + 1,
          updated_at = now()
      WHERE id = ${canonical.id}
    `;
    await tx`
      UPDATE crm_conversation_cycles
      SET message_count = sub.n,
          last_message_at = sub.last_at,
          last_message_content = sub.last_content,
          revision = crm_conversation_cycles.revision + 1,
          updated_at = now()
      FROM (
        SELECT COUNT(*)::int AS n,
               MAX(occurred_at) AS last_at,
               (ARRAY_AGG(content ORDER BY occurred_at DESC))[1] AS last_content
        FROM crm_messages
        WHERE cycle_id = ${canonicalCycle.id} AND deleted_at IS NULL
      ) sub
      WHERE id = ${canonicalCycle.id}
    `;
    await tx`
      UPDATE crm_conversation_threads
      SET last_message_at = (
        SELECT MAX(occurred_at) FROM crm_messages
        WHERE thread_id = ${canonical.id} AND deleted_at IS NULL
      )
      WHERE id = ${canonical.id}
    `;
  };

  const label = group
    .map((thread) => `${thread.id}(${thread.customer_phone ?? "no-phone"})`)
    .join(" <- ");
  if (!apply) {
    const [{ n: messageCount }] = await sql`
      SELECT COUNT(*)::int AS n FROM crm_messages WHERE thread_id = ANY(${strayIds})
    `;
    console.log(
      `  would merge ${label}; canonical cycle ${canonicalCycle.id}; moving ${messageCount} message(s), completing ${strayCycleIds.length} stray cycle(s)`,
    );
    return;
  }
  await sql.begin(run);
  console.log(`  merged ${label}`);
}

try {
  const threads = await sql`
    SELECT id, tenant_id, store_id, provider_connection_id, customer_phone,
           customer_chat_id, external_thread_id, customer_display_name, created_at
    FROM crm_conversation_threads
    WHERE channel = 'whatsapp' AND state != 'archived'
    ORDER BY created_at
  `;
  const groups = buildDuplicateGroups(threads);
  console.log(
    `${groups.length} duplicate thread group(s) found${apply ? "" : " (dry run; pass --apply to merge)"}.`,
  );
  for (const group of groups) {
    await mergeGroup(group);
  }
} finally {
  await sql.end();
}
