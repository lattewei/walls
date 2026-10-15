# Architecture — Open Studio (provisoire)

## Vue d’ensemble

Monolithe modulaire :

- **API Go** (`services/api`) : auth, users, artists, tracks, media, moderation
- **Web Next.js** (`apps/web`) : UI + lecteur audio HTML5
- **PostgreSQL** : source de vérité
- **Stockage audio** : interface abstraite (local en dev, S3-compatible en prod)

```text
Browser  →  Next.js  →  REST /api/v1  →  modules Go  →  PostgreSQL
                                      ↘  media store (fichiers)
```

## Flux métier central

1. Création / ouverture d’une page artiste (`artists`)
2. Upload d’une track + liens `track_artists` (tags)
3. Lecture audio via endpoint stream / URL signée
4. Contact via champs publics du profil uploader

## Modules API

| Module       | Responsabilité                          |
|--------------|-----------------------------------------|
| `auth`       | Inscription, login, JWT / sessions      |
| `users`      | Profils, contacts publics               |
| `artists`    | Pages, slugs, revendications            |
| `tracks`     | Productions, tags artistes              |
| `media`      | Validation, stockage, streaming         |
| `moderation` | Signalements, actions admin             |

## Principes

- Contrôle d’accès **côté serveur** uniquement
- Pas de microservices au MVP
- Migrations SQL versionnées dans `/migrations`
- Config uniquement via variables d’environnement
