# Artists API

## `POST /api/v1/artists`

Auth required: `Authorization: Bearer <token>`

Creates a **community page** (not an official account).  
Initial `claim_status`: `unclaimed`.

### Body

```json
{
  "name": "Johnny",
  "slug": "johnny",
  "bio": "optional",
  "genres": ["rap", "drill"],
  "looking_for": "optional"
}
```

- `name`: required
- `slug`: optional — derived from name if omitted (`Johnny Hallyday` → `johnny-hallyday`)
- duplicate prevention on **slug** and **normalized name** (whitespace / case)

### Responses

**201**

```json
{
  "artist": {
    "id": "…",
    "name": "Johnny",
    "slug": "johnny",
    "genres": [],
    "claim_status": "unclaimed",
    "badge": "community",
    "is_official": false,
    "created_at": "…"
  }
}
```

**400** `validation_error` — invalid name/slug  
**401** — not authenticated  
**409** `conflict` — slug or name already taken

### Example

```bash
curl -s -X POST http://localhost:8080/api/v1/artists \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Johnny","genres":["rap"]}'
```

---

## `GET /api/v1/artists`

Public list / search. No auth.

### Query params

| Param    | Default | Notes                                      |
|----------|---------|--------------------------------------------|
| `q`      | (empty) | Case-insensitive match on **name** or **slug** |
| `limit`  | `20`    | Max `50`                                   |
| `offset` | `0`     | Pagination offset                          |

### Response **200**

```json
{
  "artists": [
    {
      "id": "…",
      "name": "Johnny",
      "slug": "johnny",
      "genres": ["rap"],
      "claim_status": "unclaimed",
      "badge": "community",
      "is_official": false,
      "can_edit": false,
      "created_at": "…"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

```bash
curl -s "http://localhost:8080/api/v1/artists?q=john&limit=10&offset=0"
```

---

## `GET /api/v1/artists/{slug}`

Public. The `Authorization` header is optional: when present, the response
includes `can_edit` for the caller.

**200**

```json
{
  "artist": {
    "id": "…",
    "name": "Johnny",
    "slug": "johnny",
    "genres": ["rap"],
    "claim_status": "unclaimed",
    "badge": "community",
    "is_official": false,
    "can_edit": false,
    "created_at": "…"
  }
}
```

`can_edit` is `true` for the page creator, the user who claimed it, and admins.
Anonymous requests always get `false`.

**404** if slug is unknown or invalid.

```bash
curl -s http://localhost:8080/api/v1/artists/johnny
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/artists/johnny
```

---

## `PATCH /api/v1/artists/{slug}`

Auth required. Creator, claimed owner, or admin. JSON or multipart (to replace the cover). Slug cannot change. Omit a field to leave it. Empty string / empty `genres` clears it.

```json
{
  "name": "Johnny",
  "bio": "optional",
  "genres": ["rap"],
  "looking_for": ""
}
```

**200** `{ "artist": { … } }`  
**403** not allowed · **409** name taken

---

## Trust badge

Every artist payload includes:

| Field | Meaning |
|-------|---------|
| `claim_status` | Raw DB status: `unclaimed` \| `pending` \| `claimed` |
| `badge` | UI-ready label: `community` \| `pending_claim` \| `claimed` |
| `is_official` | `true` **only** when `claim_status` is `claimed` |
| `can_edit` | Caller may `PATCH` this wall (creator, claimed owner, or admin) |

Rules for clients:

- Show a **community / unverified** badge when `badge` is `community` or `pending_claim`.
- Never present a page as the artist’s official account unless `is_official` is `true`.
- Claim a wall with `POST /api/v1/artists/{slug}/claims`. Admins review at `/api/v1/admin/claims`. See [claims.md](./claims.md).
