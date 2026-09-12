# Composio CRM local rehearsal

This runbook connects official WhatsApp or Instagram messaging to the seeded
`test-store` without storing a provider secret in the product database. It
never claims that a message was sent: only a real provider response is treated
as an official operation.

## 1. Diagnose the project

Keep `COMPOSIO_API_KEY` in the uncommitted `.env`, then run:

```bash
pnpm crm:composio:diagnose -- \
  --whatsapp-auth-config ac_EZjyhLo1rAzx \
  --instagram-auth-config ac_qkWuffFJBRpy
```

The `ac_` values are auth configurations. A usable CRM connection needs a
separate `ca_` connected-account ID. The diagnostic prints only IDs, toolkit,
and status; it does not print provider credentials or connection state data.

## 2. Create and complete an OAuth link

Create one short-lived browser link at a time:

```bash
pnpm crm:composio:link -- \
  --channel whatsapp \
  --auth-config ac_EZjyhLo1rAzx
```

For Instagram, use `--channel instagram` and
`--auth-config ac_qkWuffFJBRpy`. Open the printed `redirectUrl`, complete the
provider authorization, then rerun the diagnostic. Do not commit the resulting
`ca_` ID.

## 3. Seed the verified connection locally

Prepare the known localhost databases and the ordinary SQL fixtures with one
guarded command:

```bash
pnpm crm:composio:prepare:local
```

This intentionally skips R2 and live provider rehearsals so an ambient `.env`
cannot redirect seed writes or smoke reads outside the disposable local
services. Use `pnpm run db:seed:artifacts:local` separately only with a
dedicated R2 seed bucket and an exact `R2_SEED_WRITE_BUCKET` allowlist.

Then add the real connected-account reference to the disposable local seed:

```bash
pnpm crm:composio:seed:local -- \
  --channel whatsapp \
  --connected-account ca_REPLACE_ME \
  --sender-id META_PHONE_NUMBER_ID \
  --graph-version vN.N \
  --phone 5511999999999
```

For Instagram, use `--channel instagram`, its `ca_` ID, and the Instagram
professional-account sender ID; omit `--phone`. The command verifies that the
connected account is active before it mutates the known localhost database and
stores only `COMPOSIO_API_KEY` as an environment-variable reference.

## 4. Exercise the UI

Run:

```bash
pnpm run dev:all:local
```

Open the CRM messaging module as the seeded owner. Use **Conexao** to confirm
the official channel status. For official WhatsApp, **Nova conversa** requires
the exact approved template name, language, and ordered body parameters.
Instagram cannot initiate a conversation; reply only after the customer sends
the first message. A failed or unavailable provider must remain visibly
unavailable and must not create synthetic success.
