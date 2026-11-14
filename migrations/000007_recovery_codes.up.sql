CREATE TABLE recovery_codes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash   TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    used_at     TIMESTAMPTZ,
    UNIQUE (user_id, code_hash)
);

CREATE INDEX recovery_codes_user_unused_idx
    ON recovery_codes (user_id)
    WHERE used_at IS NULL;
