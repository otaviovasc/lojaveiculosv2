#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import postgres from "postgres";
import { upsertCrmUiDemoConversations } from "./crm-ui-demo-conversation-persistence.mjs";
import { upsertCrmUiDemoEntities } from "./crm-ui-demo-entity-persistence.mjs";
import { buildCrmUiDemoFixtures } from "./crm-ui-demo-fixtures.mjs";
import {
  assertCrmUiDemoOwnership,
  connectionOptions,
  parseCrmUiDemoSeedArgs,
  persistCrmUiDemoAudit,
  readCrmUiDemoCounts,
  resolveCrmUiDemoPipeline,
  resolveCrmUiDemoScope,
} from "./crm-ui-demo-seed-support.mjs";

export async function runCrmUiDemoSeed(input, env = process.env) {
  const targetUrl =
    (env.APP_ENV === "staging" ? env.STAGING_DB : undefined) ??
    env.DATABASE_URL;
  const auditUrl =
    (env.APP_ENV === "staging" ? env.STAGING_AUDIT_DB : undefined) ??
    env.AUDIT_DATABASE_URL;
  if (!targetUrl)
    throw new Error("DATABASE_URL or STAGING_DB must be configured.");
  if (input.apply && env.APP_ENV !== "staging") {
    throw new Error("Applying the CRM UI demo seed is restricted to staging.");
  }
  if (input.apply && !auditUrl) {
    throw new Error(
      "AUDIT_DATABASE_URL or STAGING_AUDIT_DB is required for an applied seed.",
    );
  }

  const target = postgres(targetUrl, connectionOptions(targetUrl));
  const audit = input.apply
    ? postgres(auditUrl, connectionOptions(auditUrl))
    : null;
  try {
    const scope = await resolveCrmUiDemoScope(target, input);
    const pipeline = await resolveCrmUiDemoPipeline(target, scope);
    const now = new Date();
    const fixtures = buildCrmUiDemoFixtures({ ...pipeline, ...scope, now });
    const expectedCounts = fixtureCounts(fixtures);
    if (!input.apply) {
      return { applied: false, counts: expectedCounts, scope };
    }

    const requestId = `staging-crm-ui-demo-${randomUUID()}`;
    await target.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(
        hashtextextended(${"lojaveiculosv2:staging:seed-crm-ui-demo:" + scope.storeId}, 0)
      )`;
      await assertCrmUiDemoOwnership(tx, fixtures);
      await upsertCrmUiDemoEntities(tx, fixtures, scope, now);
      await upsertCrmUiDemoConversations(tx, fixtures, scope, now);
      const transactionCounts = await readCrmUiDemoCounts(tx, scope);
      assertExpectedCounts(transactionCounts, expectedCounts);
      await persistCrmUiDemoAudit(audit, {
        counts: transactionCounts,
        requestId,
        scope,
      });
    });
    const counts = await readCrmUiDemoCounts(target, scope);
    assertExpectedCounts(counts, expectedCounts);
    return { applied: true, counts, requestId, scope };
  } finally {
    await target.end();
    await audit?.end();
  }
}

function fixtureCounts(fixtures) {
  return {
    connections: 1,
    contacts: fixtures.contacts.length,
    leads: fixtures.leads.length,
    opportunities: fixtures.opportunities.length,
    threads: fixtures.threads.length,
    cycles: fixtures.cycles.length,
    messages: fixtures.messages.length,
    images: fixtures.messages.filter((row) => row.messageType === "image")
      .length,
    videos: fixtures.messages.filter((row) => row.messageType === "video")
      .length,
    audios: fixtures.messages.filter((row) => row.messageType === "audio")
      .length,
  };
}

function assertExpectedCounts(actual, expected) {
  for (const [key, value] of Object.entries(expected)) {
    if (actual[key] !== value) {
      throw new Error(
        `CRM UI demo read-back mismatch for ${key}: expected ${value}, found ${actual[key]}.`,
      );
    }
  }
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  try {
    const result = await runCrmUiDemoSeed(
      parseCrmUiDemoSeedArgs(process.argv.slice(2)),
    );
    const prefix = result.applied ? "Applied" : "Dry run";
    process.stdout.write(
      `${prefix}: ${result.counts.cycles} chats, ${result.counts.leads} leads, ${result.counts.messages} messages, ${result.counts.images} images, ${result.counts.videos} videos, ${result.counts.audios} audios, and ${result.counts.connections} sandbox connection for store ${result.scope.storeId}${result.requestId ? ` (request ${result.requestId})` : ""}.\n`,
    );
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}
