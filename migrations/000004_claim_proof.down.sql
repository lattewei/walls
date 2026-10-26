ALTER TABLE artist_claims
    DROP CONSTRAINT IF EXISTS artist_claims_identity_len;

DROP INDEX IF EXISTS artist_claims_code_unique;

ALTER TABLE artist_claims
    DROP COLUMN IF EXISTS identity_url,
    DROP COLUMN IF EXISTS claim_code;
