# Claims, reports & admin

## Claims — T3.5

### `POST /api/v1/artists/{slug}/claims` (auth)

```json
{
  "verification_method": "official_instagram_bio_link",
  "proof_url": "https://instagram.com/johnny"
}
```

Creates a `pending` claim and sets page `claim_status` to `pending` (unless already `claimed`).

### Admin

- `GET /api/v1/admin/claims` — pending claims
- `PATCH /api/v1/admin/claims/{id}` — `{ "status": "accepted" | "rejected" }`

`accepted` → page `claim_status=claimed`, `claimed_by` set, `is_official=true`.

Admin routes require JWT with `role=admin`.

## Reports — T6.1

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

### Admin — T6.2

- `GET /api/v1/admin/reports?status=open`
- `PATCH /api/v1/admin/reports/{id}` — `{ "status": "reviewing"|"resolved"|"dismissed" }`
- `POST /api/v1/admin/tracks/{id}/hide` — soft-remove track

## Promoting an admin

```sql
UPDATE users SET role = 'admin' WHERE handle = 'your_handle';
```

Then log in again to get a JWT with `role=admin`.
