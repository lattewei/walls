# Auth API (MVP — handles only)

No email at launch. Identity = **handle** + password.

## Handle

- 3–32 characters
- lowercase `a-z`, digits `0-9`, underscore `_`
- stored lowercase (case-insensitive on input)
- unique

## Endpoints

### `POST /api/v1/auth/register`

```json
{
  "handle": "johnny_beats",
  "password": "password8+",
  "display_name": "Johnny Beats"
}
```

`display_name` optional → defaults to handle.

**201**:

```json
{
  "user": {
    "id": "…",
    "handle": "johnny_beats",
    "display_name": "Johnny Beats",
    "role": "user",
    "created_at": "…"
  },
  "contacts": {
    "other_links": []
  },
  "access_token": "eyJ…",
  "token_type": "Bearer",
  "expires_at": "…",
  "recovery_codes": [
    "XXXXX-XXXXX",
    "…"
  ]
}
```

`recovery_codes` contains **10 single-use codes** shown only in this response. Store them offline; they are hashed server-side and cannot be retrieved again. Login responses never include them.

Errors: `400 validation_error`, `409 handle_taken`.

### `POST /api/v1/auth/login`

```json
{ "handle": "johnny_beats", "password": "password8+" }
```

**200**: same shape as register, without `recovery_codes`.  
**401** `invalid_credentials` if handle or password is wrong.

### `POST /api/v1/auth/recover`

Resets the password with a recovery code. No email involved.

```json
{
  "handle": "johnny_beats",
  "code": "XXXXX-XXXXX",
  "new_password": "newpassword8+"
}
```

**200**: same shape as register, **including a fresh set of 10 `recovery_codes`**. The used code is consumed, all other old codes are deleted, and every existing session is revoked.

- The code is case-insensitive and ignores dashes/spaces.
- Every code works **once**.
- **401** `invalid_recovery_code` if the handle or code is wrong (same message for both, to avoid account enumeration).
- **400** `validation_error` if the new password fails the password rules.

### `POST /api/v1/auth/logout`

Requires `Authorization: Bearer`. Increments the user's session version, so previously issued access tokens stop working. Responds `{"status":"ok"}`.

### `GET /api/v1/me`

Header: `Authorization: Bearer <access_token>`

**200**:

```json
{
  "user": {
    "id": "…",
    "handle": "johnny_beats",
    "display_name": "Johnny Beats",
    "role": "user",
    "created_at": "…"
  },
  "contacts": {
    "public_contact_email": "pro@example.com",
    "instagram_url": "https://instagram.com/johnny",
    "other_links": [
      { "label": "SoundCloud", "url": "https://soundcloud.com/johnny" }
    ]
  },
  "recovery_codes_remaining": 10
}
```

`contacts` only contains what the user chose to publish. There is no account email in the MVP.

The response also includes `recovery_codes_remaining`: the number of unused recovery codes for this account.

Register / login also return `contacts` (empty at first).

### `POST /api/v1/me/recovery-codes`

Auth required. Replaces **all** recovery codes with a fresh set of 10 and returns them:

```json
{
  "recovery_codes": ["XXXXX-XXXXX", "…"],
  "remaining": 10
}
```

Use this when codes are lost or few remain. Old codes stop working immediately.

### `PATCH /api/v1/me`

Profile and/or contacts; at least one field:

```json
{
  "display_name": "New name",
  "bio": "Hip-hop producer",
  "public_contact_email": "pro@example.com",
  "instagram_url": "https://instagram.com/johnny",
  "other_links": [
    { "label": "SoundCloud", "url": "https://soundcloud.com/johnny" }
  ]
}
```

To **clear** a contact field: send `null` (`"instagram_url": null`).  
Omit a field = leave it unchanged.

Contact rules:

- `public_contact_email`: valid email, **optional**, public only (not used for auth)
- `instagram_url` / links: `http://` or `https://` only (no `javascript:`)
- max 10 `other_links`; label ≤ 40 chars

### `POST /api/v1/me/password`

Auth required. Verifies the current password, stores the new hash, and revokes other sessions by bumping `session_version`. Returns a fresh access token (same shape as login).

```json
{
  "current_password": "oldpassword",
  "new_password": "newpassword8+"
}
```

**200** `{ "user", "contacts", "access_token", "token_type", "expires_at" }`  
**400** `validation_error` — new password too short or too long  
**401** `invalid_credentials` — current password is wrong

### `GET /api/v1/me/tracks`

Auth required. Your uploads, including withdrawn tracks. See [tracks](./api-tracks.md).

### `POST /api/v1/me/avatar`

Auth required. Multipart field `avatar` (jpeg, png, webp, or gif, max 5MB).

**200** `{ "user": { …, "avatar_url": "/api/v1/media/…" } }`

### `DELETE /api/v1/me`

Auth required. Soft-deletes the account, revokes sessions, withdraws the user's tracks and deletes their audio and avatar files. Artist walls they created stay up.

**200** `{ "status": "ok" }`

### `GET /api/v1/users/{handle}`

**Public** profile (no auth). Never returns password hash or private data.

**200**:

```json
{
  "user": {
    "id": "…",
    "handle": "johnny_beats",
    "display_name": "Johnny Beats",
    "bio": "…",
    "created_at": "…"
  },
  "contacts": {
    "public_contact_email": "pro@example.com",
    "instagram_url": "https://instagram.com/johnny",
    "other_links": []
  }
}
```

**404** if handle is unknown or invalid.

## Rate limit (register / login)

Per IP, fixed window (in-memory, single instance):

- default: **20 requests / minute** (`AUTH_RATE_LIMIT`, `AUTH_RATE_WINDOW`)
- **429** `rate_limited` + `Retry-After`, `X-RateLimit-*` headers

## Password

- 8–72 bytes (bcrypt’s limit)
- bcrypt hash (cost 12)
- never returned by the API
- forgotten password: use a recovery code via `POST /api/v1/auth/recover`; every account gets 10 single-use codes at registration
