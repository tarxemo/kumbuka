# Deployment

Every push to `main` builds the backend and frontend as Docker images,
pushes them to `ghcr.io/tarxemo/kumbuka-backend` and
`ghcr.io/tarxemo/kumbuka-frontend`, then SSHes into the server and restarts
the stack (`.github/workflows/deploy.yml`). Postgres runs as its own
container, on a named volume so data survives redeploys.

- Frontend → `kumbuka.tarxemo.com` (container listens on `:3032`)
- Backend → `kumbukabackend.tarxemo.com` (container listens on `:8032`)
  - GraphQL API: `https://kumbukabackend.tarxemo.com/graphql/`
  - Admin: `https://kumbukabackend.tarxemo.com/admin/`
  - Health: `https://kumbukabackend.tarxemo.com/health/`

TLS and domain routing are handled by the system-level Caddy already running
on the server (`/etc/caddy/Caddyfile`). The deploy pipeline never touches that
file — it's shared across all projects on the box.

## One-time server setup

SSH into the server as the user matching the `SERVER_USER` secret, then:

**1. Add the Caddy entries** (append to `/etc/caddy/Caddyfile`):

```
# ── Kumbuka ────────────────────────────────────────────────────────────────
kumbuka.tarxemo.com {
    reverse_proxy http://127.0.0.1:3032
}
kumbukabackend.tarxemo.com {
    reverse_proxy http://127.0.0.1:8032
}
```

Then validate and reload (reload is zero-downtime for the other sites):

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

**2. DNS.** `kumbuka.tarxemo.com` and `kumbukabackend.tarxemo.com` need A
records pointing at this server's IP, so Caddy can issue Let's Encrypt
certificates for them.

**3. Docker + Compose plugin** — already installed on this box for the other
projects (`docker compose version` to confirm).

**4. Create the deploy directory and env file:**

```bash
mkdir -p ~/kumbuka-deploy
cd ~/kumbuka-deploy
nano .env
```

Paste the contents of [`.env.prod.example`](.env.prod.example) and fill in:

- `DJANGO_SECRET_KEY` — `python3 -c "import secrets; print(secrets.token_urlsafe(50))"`
- `DB_PASSWORD` — a strong password (Postgres is initialized with it on the
  first run; changing it later requires changing it inside Postgres too)
- The hosts/origins are already correct in the template.

This `.env` is never touched by CI.

**5. GitHub repo secrets** (Settings → Secrets and variables → Actions):
`SERVER_IP`, `SERVER_USER`, `SSH_PRIVATE_KEY` — the same values used by the
other tarxemo repos.

## First deploy

Push to `main` (or run the workflow manually from the Actions tab). The deploy
job refuses to run if `.env` is missing, if `DJANGO_SECRET_KEY` /
`DJANGO_ALLOWED_HOSTS` / `DB_*` are blank, or if `DJANGO_DEBUG` isn't `False`.

Then create your admin login:

```bash
cd ~/kumbuka-deploy
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

Check it's up:

```bash
curl -s http://127.0.0.1:8032/health/ -H "Host: kumbukabackend.tarxemo.com"   # {"status": "ok", ...}
curl -sI https://kumbuka.tarxemo.com | head -1
docker compose -f docker-compose.prod.yml logs -f backend
```

## What CI does

1. **build-backend** / **build-frontend** — build each Dockerfile, push
   `:latest` and `:<commit-sha>` tags to GHCR. The frontend build bakes
   `VITE_API_URL=https://kumbukabackend.tarxemo.com` in at build time (Vite
   inlines env vars into the JS bundle, so it can't be a runtime var).
2. **deploy** — copies `docker-compose.prod.yml` to `~/kumbuka-deploy/`,
   then over SSH: validates `.env`, logs into GHCR with the run's own
   `GITHUB_TOKEN`, pulls the images, starts `db` and waits for it to be
   healthy, runs migrations as a one-off container, then starts everything.

## Notes

- Ports 8032/3032 are published on all interfaces (same as the other projects
  on this box). Caddy only needs `127.0.0.1`; to keep them private, change the
  compose mappings to `"127.0.0.1:8032:8000"` / `"127.0.0.1:3032:80"`.
- Rollback: every image is also tagged with its commit SHA, so an older build
  can be pulled by hand; there's no one-command rollback.
