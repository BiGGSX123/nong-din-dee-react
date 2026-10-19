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

## Adding a real domain + HTTPS later

Needed before LINE LIFF login will actually work in production (Let's
Encrypt can't issue a certificate for a bare IP).

1. Point the domain's DNS A record at this VM's IP
2. Edit `/etc/nginx/sites-available/nong-din-dee`: change `server_name _;` to `server_name your-domain.com;`
3. `apt-get install -y certbot python3-certbot-nginx`
4. `certbot --nginx -d your-domain.com` (also sets up auto-renewal)
5. Update `.env.prod`: `CLIENT_ORIGIN=https://your-domain.com`, fill in `LINE_CHANNEL_ID`
6. Set `VITE_LIFF_ID` as a build-time env var before the next `./infra/deploy.sh` (or export it in the shell that runs the script, since the frontend build step reads it from the environment)
7. Update the LIFF app's Endpoint URL in the LINE Developers Console to `https://your-domain.com`
8. `./infra/deploy.sh` to rebuild with the new config

## Notes

- The API container only binds to `127.0.0.1:8787` — nginx (on the host) is
  the only thing actually facing the internet on 80/443
- `deploy.sh` re-runs `prisma db push` + the seed script every time; both are
  safe to repeat (push is additive, seed uses upserts)
- Postgres data persists in the `ndd_postgres_data` Docker volume across
  container rebuilds/restarts
