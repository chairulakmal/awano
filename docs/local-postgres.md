# Local PostgreSQL (Docker)

Awano uses PostgreSQL. For development, run it with Docker Compose.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed
- Docker daemon running (`docker info` should succeed)

## Start the database

From the project root:

```bash
docker compose up -d
```

`-d` runs the container in the background.

## Check that it is running

**1. Container status**

```bash
docker compose ps
```

You want `STATE` = `running` and `HEALTH` = `healthy` (may take a few seconds after start).

**2. Docker’s view**

```bash
docker ps --filter name=awano-postgres
```

**3. Health check (Postgres ready for connections)**

```bash
docker compose exec db pg_isready -U awano -d awano
```

Expected: `awano:5432 - accepting connections`

**4. Connect with `psql` (optional)**

```bash
docker compose exec db psql -U awano -d awano -c "SELECT 1 AS ok;"
```

**5. From the host (if you have `psql` installed)**

```bash
psql "postgresql://awano:awano@localhost:5432/awano" -c "SELECT version();"
```

## App connection string

```bash
cp .env.example .env
```

`DATABASE_URL` in `.env`:

```text
postgresql://awano:awano@localhost:5432/awano?schema=public
```

After Prisma is set up:

```bash
npx prisma migrate dev
```

## Useful commands

| Task | Command |
|------|---------|
| View logs | `docker compose logs -f db` |
| Stop (keep data) | `docker compose stop` |
| Start again | `docker compose start` |
| Stop and remove container | `docker compose down` |
| Stop and **delete all data** | `docker compose down -v` |

## Troubleshooting

**Port 5432 already in use** — another Postgres is running. Stop it or change the host port in `docker-compose.yml`, e.g. `"5433:5432"`, and update `DATABASE_URL` to use port `5433`.

**Container exits immediately** — run `docker compose logs db` for the error message.
