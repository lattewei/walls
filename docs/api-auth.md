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

**200** :

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

`contacts` ne contient **que** ce que l’utilisateur a choisi de rendre public. Pas d’e-mail de compte (il n’y en a pas au MVP).

Register / login renvoient aussi `contacts` (vide au départ).

### `PATCH /api/v1/me`

Profil et/ou contacts, au moins un champ :

```json
{
  "display_name": "Nouveau nom",
  "bio": "Prod hip-hop",
  "public_contact_email": "pro@example.com",
  "instagram_url": "https://instagram.com/johnny",
  "other_links": [
    { "label": "SoundCloud", "url": "https://soundcloud.com/johnny" }
  ]
}
```

Pour **effacer** un contact : envoyer `null` (`"instagram_url": null`).  
Omettre le champ = ne pas le modifier.

Règles contacts :

- `public_contact_email` : e-mail valide, **optionnel**, purement public (pas d’auth)
- `instagram_url` / liens : `http://` ou `https://` uniquement (pas de `javascript:`)
- max 10 `other_links` ; label ≤ 40 chars

## Mot de passe

- 8 à 128 caractères
- hash bcrypt (coût 12)
- jamais renvoyé par l’API
