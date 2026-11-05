# Self-hosted VM deployment

For a plain Ubuntu VM, not Render. Run as root (or with sudo).

## One-time setup

```bash
# system packages
apt-get update
apt-get install -y ca-certificates curl gnupg nginx git

# Docker
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | tee /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl enable --now docker

# app
mkdir -p /opt/nong-din-dee
cd /opt/nong-din-dee
git clone https://github.com/BiGGSX123/nong-din-dee-react.git app
cd app
cp infra/.env.prod.example .env.prod
# edit .env.prod: set POSTGRES_PASSWORD and SESSION_JWT_SECRET to real
# random values (e.g. `openssl rand -hex 32`), and CLIENT_ORIGIN to whatever
# the browser actually hits (http://<ip> for now, https://<domain> later)

# nginx
cp infra/nginx.conf /etc/nginx/sites-available/nong-din-dee
ln -sf /etc/nginx/sites-available/nong-din-dee /etc/nginx/sites-enabled/nong-din-dee
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# first deploy
chmod +x infra/deploy.sh
./infra/deploy.sh
```

## Every update after that

```bash
cd /opt/nong-din-dee/app
git pull
./infra/deploy.sh
```

## HTTPS

The org has its own centrally-issued wildcard certificate for `*.ldd.go.th`
(GlobalSign OV, valid through Apr 2027) rather than using Let's Encrypt, so
there's no certbot step. It's already installed:

- `/etc/nginx/ssl/ldd-wildcard/fullchain.crt` (leaf + intermediate, `644`)
- `/etc/nginx/ssl/ldd-wildcard/privkey.key` (`600`, root-only)
- wired into `infra/nginx.conf`'s `443 ssl` server block (`server_name _;`,
  so it answers for any hostname — the cert being a wildcard is what makes
  that work for any `*.ldd.go.th` subdomain)

This only covers `*.ldd.go.th` / `ldd.go.th` — **not** the bare IP, so
`https://101.44.56.196` will still show a browser warning and LINE LIFF
will refuse to load it there. What's still needed to actually go live:

1. Pick a subdomain (e.g. `nongdindee.ldd.go.th`) and have IT point its DNS
   A record at this VM's IP — the cert already covers whatever subdomain is
   chosen, no new cert needed
2. Update `.env.prod`: `CLIENT_ORIGIN=https://nongdindee.ldd.go.th` (or
   whichever subdomain), fill in `LINE_CHANNEL_ID`
3. Set `VITE_LIFF_ID` as a build-time env var before the next
   `./infra/deploy.sh` (or export it in the shell that runs the script,
   since the frontend build step reads it from the environment)
4. Update the LIFF app's Endpoint URL in the LINE Developers Console to
   `https://nongdindee.ldd.go.th`
5. `./infra/deploy.sh` to rebuild with the new config

The cert expires **2027-04-10** — renewal has to come from the same
internal process that issued this one (not certbot auto-renewal), so
whoever manages it on the IT side should be reminded before then.

## Notes

- The API container only binds to `127.0.0.1:8787` — nginx (on the host) is
  the only thing actually facing the internet on 80/443
- `deploy.sh` re-runs `prisma db push` + the seed script every time; both are
  safe to repeat (push is additive, seed uses upserts)
- Postgres data persists in the `ndd_postgres_data` Docker volume across
  container rebuilds/restarts
