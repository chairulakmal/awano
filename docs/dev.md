# Local PostgreSQL

How to give Awano a database while you develop. The only thing Awano requires is a PostgreSQL 18 server that `DATABASE_URL` can reach; how that server is started is your choice. This document covers three things: starting a server with Docker, checking that it accepts connections, and fixing the two problems that happen most often.

Awano used to ship a `docker-compose.yml`. It no longer does, because a database container per project is unnecessary when one PostgreSQL server can hold a separate database for each project you work on.

## Start a server

If you already run PostgreSQL 18, create a database called `awano` in it and skip to the next section.

Otherwise, start a throwaway container:

```bash
docker run -d --name awano-db -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=awano postgres:18
```

The container keeps its data until you delete it with `docker rm -f awano-db`.

## Check that it accepts connections

```bash
docker exec awano-db pg_isready -U postgres -d awano
```

Expected output: `/var/run/postgresql:5432 - accepting connections`.

From the host, if you have `psql` installed:

```bash
psql "postgresql://postgres:postgres@localhost:5432/awano" -c "SELECT version();"
```

## Connect the application

```bash
cp .env.example .env
```

The `DATABASE_URL` in `.env` must match the server:

```text
postgresql://postgres:postgres@localhost:5432/awano?schema=public
```

Then create the tables and the demo data:

```bash
npx prisma migrate dev
npx prisma db seed
```

`npm run dev` does not start the database. Start the database first, then run the dev server.

## Useful commands

| Task                        | Command                             |
| --------------------------- | ----------------------------------- |
| View logs                   | `docker logs -f awano-db`           |
| Stop (keep data)            | `docker stop awano-db`              |
| Start again                 | `docker start awano-db`             |
| Delete the container and its data | `docker rm -f awano-db`       |
| Reset the schema and reseed | `npm run db:reset`                  |

## Troubleshooting

**Port 5432 already in use**: another PostgreSQL server is running. Use it instead of starting a second one, or publish this one on a different host port (`-p 5433:5432`) and change the port in `DATABASE_URL` to match.

**The container exits immediately**: run `docker logs awano-db` to see the error message.

**Prisma reports that the database does not exist**: the server is running but has no `awano` database. Create it with `docker exec awano-db createdb -U postgres awano`.
