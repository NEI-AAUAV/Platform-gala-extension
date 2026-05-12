# Gala Extension

Event management extension for the NEI Platform. Handles the full lifecycle of the annual Gala dinner: registration, table management, nominations, voting, and administration.

## Services

| Service    | Stack                        | Port   | Path        |
| ---------- | ---------------------------- | ------ | ----------- |
| `api-gala` | FastAPI · Motor · MongoDB    | `8004` | `api-gala/` |
| `web-gala` | React 18 · Vite · Tailwind   | `3002` | `web-gala/` |

Both services sit behind the Platform's nginx reverse proxy and share its MongoDB instance and JWT authentication infrastructure.

## Features

- **Registration wizard** — 6-step flow collecting personal data, meal preferences, companions, bus option, and payment (MB Way / IBAN / phased)
- **Table management** — create, invite, join, merge, and administrate seating tables
- **Nominations & voting** — open nomination periods per category, top-N shortlisting, blind voting, and configurable result visibility
- **Admin panel** — manage registrations, payments, tables, vote categories, homepage content, and manager permissions
- **Email notifications** — configurable SMTP emails for registration confirmation, payment reminders, and table events
- **File storage** — payment proof uploads and table/nominee photos via Cloudflare R2

## Running with the Platform

From the Platform repository root:

```bash
docker compose -f compose.yml -f extensions/gala/compose.override.yml up
```

Services are available at:

- API: `http://localhost:8004` (Swagger UI at `/docs`)
- Web: `http://localhost:3002`

The nginx proxy routes `/api/gala/` and `/gala/` automatically.

## Local Development

### Backend

Requires [Poetry](https://python-poetry.org/) and a running MongoDB instance.

```bash
# Start MongoDB
docker run -d -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=mongo \
  -e MONGO_INITDB_ROOT_PASSWORD=mongo \
  --name mongo_db mongo

# Install and run
cd api-gala
poetry install
poetry run uvicorn app.main:app --port 8004 --reload
```

### Frontend

Requires Node 18+ and Yarn.

```bash
cd web-gala
yarn install
yarn dev
```

## Environment Variables

### Backend Configuration

| Variable               | Default                                   | Description              |
| ---------------------- | ----------------------------------------- | ------------------------ |
| `MONGO_SERVER`         | `localhost`                               | MongoDB host             |
| `MONGO_USER`           | `mongo`                                   | MongoDB username         |
| `MONGO_PASSWORD`       | `mongo`                                   | MongoDB password         |
| `JWT_PUBLIC_KEY_PATH`  | `../../../dev-keys/jwt.key.pub`           | Path to ES512 public key |
| `EMAIL_ENABLED`        | `True`                                    | Enable SMTP email        |
| `EMAIL_SENDER_ADDRESS` | —                                         | Sender address           |
| `EMAIL_SMTP_HOST`      | —                                         | SMTP server host         |
| `EMAIL_SMTP_PORT`      | `587`                                     | SMTP server port         |
| `EMAIL_SMTP_USER`      | —                                         | SMTP username            |
| `EMAIL_SMTP_PASSWORD`  | —                                         | SMTP password            |
| `AUTHENTIK_URL`        | `https://nei.web.ua.pt/authentik`         | Authentik instance URL   |
| `AUTHENTIK_TOKEN`      | —                                         | Authentik API token      |
| `R2_ENDPOINT_URL`      | —                                         | Cloudflare R2 endpoint   |
| `R2_ACCESS_KEY_ID`     | —                                         | R2 access key            |
| `R2_SECRET_ACCESS_KEY` | —                                         | R2 secret key            |
| `R2_BUCKET`            | —                                         | R2 bucket name           |
| `R2_PUBLIC_BASE_URL`   | —                                         | Public CDN base URL      |

### Frontend Configuration

Configuration is baked at build time via Vite. `BASE_URL` defaults to `https://nei.web.ua.pt` in production and `http://localhost` in development.

## Testing

### Backend Tests

```bash
cd api-gala
poetry run pytest              # all tests
poetry run pytest --tb=short   # compact output
poetry run pytest --cov=app    # with coverage
```

Each test runs against its own isolated MongoDB database, created and dropped automatically.

### Frontend Tests

```bash
cd web-gala
yarn lint                      # ESLint + Prettier
npx tsc --noEmit               # TypeScript check
npx playwright test            # E2E tests (Chromium + Firefox)
npx playwright test --headed   # with browser UI
```

## CI

| Workflow           | Trigger                   | Jobs                                        |
| ------------------ | ------------------------- | ------------------------------------------- |
| `ci_api-gala.yml`  | push/PR to `api-gala/**`  | pytest against MongoDB 7                    |
| `ci_web-gala.yml`  | push/PR to `web-gala/**`  | lint + tsc; Playwright E2E (Chromium)       |

## Project Structure

```text
extensions/gala/
├── api-gala/               # FastAPI backend
│   ├── app/
│   │   ├── api/            # Route handlers (table, vote, registration, admin…)
│   │   ├── core/           # DB, config, email, logging
│   │   ├── models/         # Pydantic documents
│   │   ├── services/       # Business logic
│   │   └── tests/
│   ├── emails-src/         # Email template sources
│   ├── pyproject.toml
│   └── Dockerfile / Dockerfile.prod
├── web-gala/               # React frontend
│   ├── src/
│   │   ├── pages/          # Route-level components
│   │   ├── components/     # Shared UI
│   │   ├── hooks/          # SWR data hooks
│   │   ├── services/       # Axios API clients
│   │   └── stores/         # Zustand state (auth, config)
│   ├── e2e/                # Playwright tests
│   ├── package.json
│   └── Dockerfile / Dockerfile.prod
├── .github/workflows/
├── compose.override.yml        # Development compose overlay
├── compose.override.prod.yml   # Production compose overlay
└── manifest.json               # Extension metadata
```

## Production

Production images are pulled from `ghcr.io/nei-aauav/` using the configured `TAG`. The compose overlay mounts JWT public keys and SSL certificates from `/deploy/` and sets restart policy to `always`.
