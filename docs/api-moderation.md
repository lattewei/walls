# Claims, reports & admin

## Claims

End-to-end behavior, states, and UX: [claims.md](./claims.md).

### `POST /api/v1/artists/{slug}/claims` (auth)

```json
{
  "identity_url": "https://instagram.com/johnny",
  "proof_url": "https://instagram.com/p/…",
  "verification_method": "identity"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `identity_url` | yes | Official account or artist site, `http(s)`, max 500 chars |
| `proof_url` | no | Public post containing the claim code; can be added later |
| `verification_method` | no | Free label, max 100 chars; defaults to `identity` |

Creates a `pending` claim and sets page `claim_status` to `pending` (unless already `claimed`).
The response contains the generated `claim_code`; the claimant publishes it from the
official account and then supplies `proof_url`.

**201**

```json
{
  "claim": {
    "id": "…",
    "artist_id": "…",
    "artist_slug": "johnny",
    "artist_name": "Johnny",
    "user_id": "…",
    "user_handle": "producer",
    "status": "pending",
    "verification_method": "identity",
    "claim_code": "A1B2C3D4",
    "identity_url": "https://instagram.com/johnny",
    "created_at": "…"
  }
}
```

**400** `validation_error` — missing or malformed URL
**401** — not authenticated
**404** `not_found` — unknown wall
**409** `conflict` — wall is claimed, or you already have a pending claim

### `PATCH /api/v1/me/claims/{id}` (auth)

```json
{ "proof_url": "https://instagram.com/p/…" }
```

Updates the proof link while the claim is still `pending`. Send an empty string to
clear it. Any other status returns **404** — claims cannot be edited after review.

**200** `{ "claim": { … } }`
**400** `validation_error` — malformed URL
**404** `not_found` — claim does not exist, is not yours, or is no longer pending

### `GET /api/v1/me/claims` (auth)

Your claims, newest first. Optional `limit` / `offset` (max 50).

**200** `{ "claims": [ { "id", "artist_id", "artist_slug", "artist_name", "status", "claim_code", "identity_url", "proof_url", "created_at" } ], "total", "limit", "offset" }`

### Admin

- `GET /api/v1/admin/claims` — pending claims only, oldest first
- `PATCH /api/v1/admin/claims/{id}` — `{ "status": "accepted" | "rejected" }`

`accepted` → page `claim_status=claimed`, `claimed_by` set, `is_official=true`, and
every other pending claim for that wall is automatically rejected in the same
transaction.

`rejected` → the wall returns to `unclaimed`, or stays `pending` if other claims are
still waiting. The claimant may submit a new claim.

Claims have two database guarantees: at most one `pending` claim per
`(artist, user)`, and at most one `accepted` claim per wall.

Admin routes require an authenticated user whose **current** database role is `admin`. The JWT is only an identity; the role is loaded on each request.

## Reports

### `POST /api/v1/reports` (auth)

```json
{
  "target_type": "track",
  "target_id": "uuid",
  "reason": "spam",
  "details": "optional"
}
```

`target_type`: `track` | `artist` | `user`

### Admin

- `GET /api/v1/admin/reports?status=open`
- `PATCH /api/v1/admin/reports/{id}` — `{ "status": "reviewing"|"resolved"|"dismissed" }`
- `POST /api/v1/admin/tracks/{id}/hide` — mark the track removed and delete the audio file

Admin report rows are enriched with `target_label`, `target_slug` (artist slug or
user handle), and `reporter_handle` so the console does not have to resolve three
different target types.

## Promoting an admin

```sql
UPDATE users SET role = 'admin' WHERE handle = 'your_handle';
```

The next authenticated request sees the new role. The web shell refreshes the
cached user on load, so no re-login is required.
