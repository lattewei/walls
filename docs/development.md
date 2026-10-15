# Développement local

## Prérequis

1. Go ≥ 1.22
2. Docker Desktop (pour PostgreSQL)
3. Copier `.env.example` → `.env`

## Base de données

```bash
docker compose up -d db
```

Vérifier :

```bash
docker compose ps
```

## Migrations

```bash
cd services/api
go run ./cmd/migrate up
go run ./cmd/migrate down   # une étape en arrière
go run ./cmd/migrate version
```

Les fichiers SQL sont dans `/migrations` à la racine du dépôt.

## Lancer l’API

```bash
cd services/api
go run ./cmd/api
```

Health checks :

- `GET /health` — process up
- `GET /api/v1/health` — process + DB

## Tests

```bash
cd services/api
go test ./...
```

## Sans Docker

Installer PostgreSQL localement, créer la base `openstudio`, puis ajuster `DATABASE_URL` dans `.env`.
