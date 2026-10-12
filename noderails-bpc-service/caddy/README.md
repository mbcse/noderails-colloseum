# Caddy reverse proxy (standalone)

Runs **Caddy only** in Docker. Terminates TLS and reverse-proxies to multiple backends on the same server.

Copy this folder to your server (e.g. `/opt/caddy`), edit `Caddyfile`, start.

## Prerequisites

- Docker + Docker Compose
- DNS for each hostname → this server's IP
- Backends already running (host ports or other containers)

## Start

```bash
docker compose up -d
# or
./up.sh
```

## Upstream patterns

| Caddyfile target | Backend |
|----------------|---------|
| `host.docker.internal:4000` | App on the host (NodeRails, BPC on `:8090`, etc.) |
| `leanrpc:5111` | Docker container named `leanrpc` on network `caddy_proxy` |

### Connect an existing container to Caddy

If `leanrpc` (or another app) runs in its own compose stack:

```bash
docker network connect caddy_proxy leanrpc
```

Or add to that service's compose:

```yaml
networks:
  caddy_proxy:
    external: true

services:
  leanrpc:
    networks:
      - default
      - caddy_proxy
```

## Add a new site

Edit `Caddyfile`, then reload:

```bash
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

Or restart:

```bash
docker compose restart caddy
```

## Logs

```bash
docker compose logs -f caddy
```

## Stop

```bash
docker compose down
```

Certificates persist in Docker volumes `caddy_data` and `caddy_config`.
