# Claims, reports & admin

## Claims

### `POST /api/v1/artists/{slug}/claims` (auth)

```json
{
  "verification_method": "social",
  "proof_url": "https://instagram.com/johnny"
}
```

Creates a `pending` claim and sets page `claim_status` to `pending` (unless already `claimed`).

### `GET /api/v1/me/claims` (auth)

Your claims, newest first. Optional `limit` / `offset`.

**200** `{ "claims": [ { "id", "artist_id", "artist_slug", "status", … } ], "total", "limit", "offset" }`

### Admin

- `GET /api/v1/admin/claims` — pending claims
- `PATCH /api/v1/admin/claims/{id}` — `{ "status": "accepted" | "rejected" }`

`accepted` → page `claim_status=claimed`, `claimed_by` set, `is_official=true`.

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

## Promoting an admin

```sql
UPDATE users SET role = 'admin' WHERE handle = 'your_handle';
```

The next authenticated request sees the new role. No new login is required.
