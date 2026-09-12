UPDATE "crm_channel_connections"
SET "external_instance_id" = NULL, "updated_at" = now()
WHERE "provider" = 'zapi' AND "external_instance_id" IS NOT NULL;

-- Legacy connection metadata was not guaranteed to distinguish references,
-- plaintext values, and sealed values. Remove credential-bearing keys at any
-- depth instead of copying an unverifiable secret into the BYOK contract.
-- Non-secret metadata (routing, fixture, provider, and history references) is
-- retained. Every existing Z-API connection must re-enter all three BYOK
-- credentials and rotate its webhook secret after deployment.
CREATE OR REPLACE FUNCTION "billing_scrub_legacy_zapi_secret_keys"(value jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
STRICT
AS $$
DECLARE
  scrubbed jsonb;
BEGIN
  CASE jsonb_typeof(value)
    WHEN 'object' THEN
      SELECT COALESCE(
        jsonb_object_agg(entry.key, "billing_scrub_legacy_zapi_secret_keys"(entry.value)),
        '{}'::jsonb
      )
      INTO scrubbed
      FROM jsonb_each(value) AS entry
      WHERE entry.key NOT IN (
        'clientToken', 'instanceId', 'instanceToken', 'webhookSecret',
        'client_token', 'instance_id', 'instance_token', 'webhook_secret'
      );
      RETURN scrubbed;
    WHEN 'array' THEN
      SELECT COALESCE(
        jsonb_agg("billing_scrub_legacy_zapi_secret_keys"(entry.value) ORDER BY entry.ordinality),
        '[]'::jsonb
      )
      INTO scrubbed
      FROM jsonb_array_elements(value) WITH ORDINALITY AS entry(value, ordinality);
      RETURN scrubbed;
    ELSE
      RETURN value;
  END CASE;
END
$$;

UPDATE "crm_channel_connections"
SET
  "state" = CASE
    WHEN "state" IN ('archived', 'paused') THEN "state"
    ELSE 'disconnected'::"crm_channel_connection_state"
  END,
  "metadata" = "billing_scrub_legacy_zapi_secret_keys"(
    coalesce("metadata", '{}'::jsonb)
  ) || jsonb_build_object(
    'connected', false,
    'credentialResetRequired', true,
    'degraded', true,
    'errorCode', 'credentials_incomplete',
    'credentialsStatus', 'credentials_incomplete',
    'webhookSecretStatus', 'rotation_required'
  ),
  "webhook_url" = NULL,
  "updated_at" = now()
WHERE "provider" = 'zapi';

DROP FUNCTION "billing_scrub_legacy_zapi_secret_keys"(jsonb);

DO $$ BEGIN
  ALTER TABLE "crm_channel_connections"
    ADD CONSTRAINT "crm_channel_connections_zapi_instance_redacted_check"
    CHECK ("provider" <> 'zapi' OR "external_instance_id" IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
