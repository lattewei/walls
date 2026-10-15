# Artists API

## `POST /api/v1/artists` — T3.1

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

## `GET /api/v1/artists` — T3.3

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

## `GET /api/v1/artists/{slug}` — T3.2

Public, no auth.

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
    "created_at": "…"
  }
}
```

**404** if slug is unknown or invalid.

```bash
curl -s http://localhost:8080/api/v1/artists/johnny
```

---

## Trust badge — T3.4

Every artist payload includes:

| Field | Meaning |
|-------|---------|
| `claim_status` | Raw DB status: `unclaimed` \| `pending` \| `claimed` |
| `badge` | UI-ready label: `community` \| `pending_claim` \| `claimed` |
| `is_official` | `true` **only** when `claim_status` is `claimed` |

Rules for clients:

- Show a **community / unverified** badge when `badge` is `community` or `pending_claim`.
- Never present a page as the artist’s official account unless `is_official` is `true`.
- Claim flow (request + review) is **T3.5** — until then new pages stay `unclaimed` / `community`.
