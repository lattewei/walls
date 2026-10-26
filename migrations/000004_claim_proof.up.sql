-- Claim codes and the official account used to prove ownership.

ALTER TABLE artist_claims
    ADD COLUMN claim_code TEXT NOT NULL
        DEFAULT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    ADD COLUMN identity_url TEXT;

CREATE UNIQUE INDEX artist_claims_code_unique ON artist_claims (claim_code);

ALTER TABLE artist_claims
    ADD CONSTRAINT artist_claims_identity_len
    CHECK (identity_url IS NULL OR char_length(identity_url) <= 500);
