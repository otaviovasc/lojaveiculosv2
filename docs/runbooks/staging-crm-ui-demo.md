# CRM UI demo seed for staging

Use this seed when frontend or product work needs realistic CRM screens without
connecting a WhatsApp account. It writes only fictional records into one
explicit staging store.

## Product contract

- Target segment: internal product, design, frontend, and QA operators working
  on the staging CRM.
- Customer outcome: none. This dataset exists only to make CRM UI states
  available during development.
- Leading check: the read-back reports 10 chats, 10 leads, 40 messages, three
  images, two videos, two audios, and one sandbox connection.
- Billing and entitlement: the seed does not grant billing features or change
  entitlements. Run the existing staging access workflow separately when the
  target user cannot open CRM.
- Support owner: the Loja Veiculos frontend and QA maintainers.
- Degraded state: conversations and local image/document assets remain usable
  if the public sample audio or video host is unavailable. The affected media
  players will fail visibly; no fallback may report a provider delivery.

## Safety contract

The command requires an explicit current V2 user and store. It verifies active
access before building the dataset. `--apply` works only with
`APP_ENV=staging`, requires the staging audit database, takes a store-scoped
advisory lock, and writes the product rows in one transaction.

The fixture uses store-derived UUIDs and marks every owned row with
`fixtureNamespace=crm-ui-demo-v1`. Rerunning the command updates only those
rows. It stops if a deterministic ID belongs to non-demo data.

The fictional connection uses WhatsApp through the Meta Cloud/Composio schema
triple, but its state is `sandbox`. It has no authorization, external
connection ID, credentials, webhook, or provider delivery evidence. Its
metadata also sets `dispatchEnabled=false` and `officialOperation=false`.

## Run it

Resolve the current user after any staging reset. Do not reuse a UUID from an
older reset without checking it.

Dry run:

```bash
APP_ENV=staging node --env-file=.env tools/staging/seed-crm-ui-demo.mjs \
  --user-id=<current-v2-user-or-clerk-id> \
  --store-id=<current-v2-store-id>
```

Apply:

```bash
APP_ENV=staging node --env-file=.env tools/staging/seed-crm-ui-demo.mjs \
  --user-id=<current-v2-user-or-clerk-id> \
  --store-id=<current-v2-store-id> \
  --apply
```

The store must already have a CRM pipeline with at least one active stage. Run
`staging:seed-store` first when the script reports that prerequisite is missing.
An applied run records `staging.crm.ui_demo_seed` in the separate audit
database and verifies the persisted counts before returning success.

## Dataset coverage

The ten chats cover fresh and unassigned queues, assigned bot and human
attendance, unread messages, a completed conversation, and a failed outbound
message. The messages include text, image, audio, video, document, location,
contact, and sticker rendering states. Names, `example.test` emails, and invalid
`+5500...` phone numbers are deliberately fictional.
