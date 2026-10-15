# API Artistes

## `POST /api/v1/artists` — T3.1

Auth requise : `Authorization: Bearer <token>`

Crée une **page communautaire** (pas un compte officiel).  
`claim_status` initial : `unclaimed`.

### Body

```json
{
  "name": "Johnny",
  "slug": "johnny",
  "bio": "optionnel",
  "genres": ["rap", "drill"],
  "looking_for": "optionnel"
}
```

- `name` : obligatoire
- `slug` : optionnel — dérivé du nom si absent (`Johnny Hallyday` → `johnny-hallyday`)
- anti-doublon sur **slug** et sur **nom normalisé** (espaces / casse)

### Réponses

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

**400** `validation_error` — nom/slug invalide  
**401** — non connecté  
**409** `conflict` — slug ou nom déjà pris

### Exemple

```bash
curl -s -X POST http://localhost:8080/api/v1/artists \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Johnny","genres":["rap"]}'
```

---

## `GET /api/v1/artists/{slug}` — T3.2

Public, pas d’auth.

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

**404** si slug inconnu ou invalide.

```bash
curl -s http://localhost:8080/api/v1/artists/johnny
```
