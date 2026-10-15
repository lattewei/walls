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
    "created_at": "…"
  }
}
```

**404** if slug is unknown or invalid.

```bash
curl -s http://localhost:8080/api/v1/artists/johnny
```
