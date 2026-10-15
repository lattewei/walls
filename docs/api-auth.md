# API Auth (MVP — handles only)

Pas d’e-mail au démarrage. L’identité = **handle** + mot de passe.

## Handle

- 3 à 32 caractères
- minuscules `a-z`, chiffres `0-9`, underscore `_`
- stocké en minuscules (insensible à la casse à l’entrée)
- unique

## Endpoints

### `POST /api/v1/auth/register`

```json
{
  "handle": "johnny_beats",
  "password": "motdepasse8+",
  "display_name": "Johnny Beats"
}
```

`display_name` optionnel → défaut = handle.

**201** :

```json
{
  "user": {
    "id": "…",
    "handle": "johnny_beats",
    "display_name": "Johnny Beats",
    "role": "user",
    "created_at": "…"
  },
  "access_token": "eyJ…",
  "token_type": "Bearer",
  "expires_at": "…"
}
```

Erreurs : `400 validation_error`, `409 handle_taken`.

### `POST /api/v1/auth/login`

```json
{ "handle": "johnny_beats", "password": "motdepasse8+" }
```

**200** : même forme que register.  
**401** `invalid_credentials` si handle ou mot de passe incorrect.

### `POST /api/v1/auth/logout`

Stateless JWT : le client jette le token. Répond `{"status":"ok"}`.

### `GET /api/v1/me`

Header : `Authorization: Bearer <access_token>`

**200** : `{ "user": { … } }`

### `PATCH /api/v1/me`

```json
{ "display_name": "Nouveau nom", "bio": "Prod hip-hop" }
```

Au moins un champ requis.

## Mot de passe

- 8 à 128 caractères
- hash bcrypt (coût 12)
- jamais renvoyé par l’API
