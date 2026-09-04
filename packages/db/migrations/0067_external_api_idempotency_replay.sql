ALTER TABLE "api_idempotency_keys"
ADD COLUMN "response_body" jsonb;

ALTER TABLE "api_idempotency_keys"
ADD COLUMN "response_content_type" varchar(100);

-- Rows completed before replay snapshots existed cannot be replayed safely.
-- Keep them terminal and require a new key instead of misclassifying them as in-flight.
UPDATE "api_idempotency_keys"
SET "status" = 'failed'
WHERE "status" = 'completed';

ALTER TABLE "api_idempotency_keys"
ADD CONSTRAINT "api_idempotency_keys_replay_response_check"
CHECK (
  "status" <> 'completed'
  OR (
    "response_body" IS NOT NULL
    AND "response_content_type" IS NOT NULL
    AND "response_content_type" ILIKE 'application/json%'
    AND "status_code" IS NOT NULL
    -- JSONB text normalization can expand the original bounded wire payload.
    AND octet_length("response_body"::text) <= 524288
  )
);
