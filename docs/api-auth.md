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
  "expires_at": "…"
}
```

Errors: `400 validation_error`, `409 handle_taken`.

### `POST /api/v1/auth/login`

```json
{ "handle": "johnny_beats", "password": "password8+" }
```

**200**: same shape as register.  
**401** `invalid_credentials` if handle or password is wrong.

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
  }
}
```

`contacts` only contains what the user chose to publish. There is no account email in the MVP.

Register / login also return `contacts` (empty at first).

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

### `POST /api/v1/me/avatar`

Auth required. Multipart field `avatar` (jpeg, png, webp, or gif, max 5MB).

**200** `{ "user": { …, "avatar_url": "/api/v1/media/…" } }`

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
