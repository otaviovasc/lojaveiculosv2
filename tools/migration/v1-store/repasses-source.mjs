import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import postgres from "postgres";

const CONTAINER_NAME = `lojaveiculos-repasses-import-${process.pid}`;
const SOURCE_PASSWORD = "temporary_repasses_import_only";
const TABLES = ["connections", "crm_agents", "chat_sessions", "messages"];

function docker(...args) {
  return execFileSync("docker", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function dockerWithInput(input, ...args) {
  return execFileSync("docker", args, {
    encoding: "utf8",
    input,
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

export async function withRepassesArchive(archivePath, callback) {
  if (!existsSync(archivePath))
    throw new Error(`Repasses CRM archive not found: ${archivePath}`);
  docker(
    "run",
    "--rm",
    "-d",
    "--name",
    CONTAINER_NAME,
    "--mount",
    `type=bind,source=${archivePath},target=/repasses-archive,readonly`,
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
      'until [ "$(cat /proc/1/comm)" = "postgres" ] && pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done',
    );
    docker("exec", CONTAINER_NAME, "createdb", "-U", "postgres", "repasses");
    dockerWithInput(
      ENUMS_SQL,
      "exec",
      "-i",
      CONTAINER_NAME,
      "psql",
      "-U",
      "postgres",
      "-d",
      "repasses",
      "-v",
      "ON_ERROR_STOP=1",
    );
    const tableArgs = TABLES.flatMap((table) => ["--table", table]);
    restore("--section", "pre-data", tableArgs);
    restore("--data-only", tableArgs);
    const port = docker("port", CONTAINER_NAME, "5432/tcp").split(":").at(-1);
    const sql = postgres(
      `postgresql://postgres:${SOURCE_PASSWORD}@127.0.0.1:${port}/repasses`,
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

export async function loadRepassesCrmData(sql, storeId) {
  const connections = await sql.unsafe(
    `SELECT id, uuid, provider, instance_name, phone, credentials, status,
            name, instance_id, mode, loja_id, loja_slug, connection_phone_number,
            catalog_sync_enabled, is_active, deleted_at, created_at, updated_at
       FROM connections
      WHERE loja_id=$1 AND mode='CRM' AND deleted_at IS NULL
      ORDER BY id`,
    [storeId],
  );
  if (!connections.length)
    throw new Error(
      `No Repasses CRM connection found for V1 store ${storeId}.`,
    );
  const connectionIds = connections.map((connection) => connection.id);
  const agents = await sql.unsafe(
    `SELECT id, uuid, connection_id, email, clerk_user_id, user_id
       FROM crm_agents
      WHERE connection_id = ANY($1::int[])
      ORDER BY id`,
    [connectionIds],
  );
  const sessions = await sql.unsafe(
    `SELECT id, uuid, connection_id, buyer_phone, buyer_name, status,
            conversation_step, human_takeover_at, last_message_at,
            message_count, created_at, updated_at, assigned_agent_id,
            disposition, last_message_content, last_read_at, profile_photo_url,
            buyer_chat_lid, channel, last_customer_read_at, source,
            channel_external_id, fresh_lead_at, first_handled_at,
            last_assigned_at, deleted_at, source_lead_id, original_channel
       FROM chat_sessions
      WHERE connection_id = ANY($1::int[])
      ORDER BY id`,
    [connectionIds],
  );
  const sessionIds = sessions.map((session) => session.id);
  const messages = sessionIds.length
    ? await sql.unsafe(
        `SELECT m.id, m.uuid, m.chat_session_id, m.external_id, m.direction,
                m.type, m.status, m.content, m.media_url, m.media_type,
                m.created_at, m.updated_at, m.sender_type, m.sender_agent_id,
                m.channel, m.channel_message_id, m.provider_timestamp,
                m.deleted_at, s.connection_id
           FROM messages m
           JOIN chat_sessions s ON s.id=m.chat_session_id
          WHERE m.chat_session_id = ANY($1::int[])
          ORDER BY m.chat_session_id, m.provider_timestamp, m.id`,
        [sessionIds],
      )
    : [];
  return { agents, connections, messages, sessions };
}

function restore(...args) {
  const flatArgs = args.flat();
  docker(
    "exec",
    CONTAINER_NAME,
    "pg_restore",
    "-U",
    "postgres",
    "-d",
    "repasses",
    "--no-owner",
    "--no-privileges",
    ...flatArgs,
    "/repasses-archive",
  );
}

const ENUMS_SQL = `
CREATE TYPE enum_chat_sessions_channel AS ENUM ('WHATSAPP', 'OLX_CHAT', 'WEB_CHAT');
CREATE TYPE enum_chat_sessions_conversation_step AS ENUM ('INITIAL', 'VEHICLE_INQUIRY', 'COLLECTING_BUYER_INFO', 'BUYER_REGISTERED', 'DEAL_CREATED', 'AWAITING_SIGNAL', 'SIGNAL_PAID', 'COLLECTING_DOCUMENTS', 'AWAITING_CONFIRMATION', 'COMPLETED');
CREATE TYPE enum_chat_sessions_human_takeover_reason AS ENUM ('USER_REQUESTED', 'LOW_CONFIDENCE', 'KEYWORD_TRIGGER', 'ADMIN_INTERVENTION', 'ERROR_FALLBACK', 'INVALID_PHONE_LID', 'TOOL_ERROR', 'SYSTEM_ERROR');
CREATE TYPE enum_chat_sessions_original_channel AS ENUM ('WHATSAPP', 'OLX_CHAT');
CREATE TYPE enum_chat_sessions_status AS ENUM ('ACTIVE', 'WAITING_RESPONSE', 'HUMAN_TAKEOVER', 'COMPLETED', 'EXPIRED', 'MINIBOT_ACTIVE');
CREATE TYPE enum_connections_mode AS ENUM ('REPASSES', 'CRM');
CREATE TYPE enum_connections_provider AS ENUM ('EVOLUTION', 'ZAPI', 'CLOUD_API');
CREATE TYPE enum_connections_status AS ENUM ('PENDING', 'CONNECTING', 'CONNECTED', 'DISCONNECTED', 'BANNED', 'ERROR', 'WAITING_QR', 'WAITING_PHONE_CODE');
CREATE TYPE enum_crm_agents_role AS ENUM ('ADMIN', 'AGENT', 'OWNER');
CREATE TYPE enum_messages_channel AS ENUM ('WHATSAPP', 'OLX_CHAT', 'WEB_CHAT');
CREATE TYPE enum_messages_direction AS ENUM ('INBOUND', 'OUTBOUND');
CREATE TYPE enum_messages_sender_type AS ENUM ('AI', 'HUMAN', 'CUSTOMER');
CREATE TYPE enum_messages_status AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');
CREATE TYPE enum_messages_type AS ENUM ('TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT', 'STICKER', 'LOCATION', 'CONTACT', 'TEMPLATE', 'INTERACTIVE', 'CATALOG');
`;
