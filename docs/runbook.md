# Runbook

How the site is hosted, and how to set it up, deploy it, roll it back and rebuild it.

## How it fits together

```
git push to main
   └─ GitHub Actions: lint → typecheck → build → out/
         └─ rsync over SSH (deploy user) → /var/www/rukysite/releases/<time>-<commit>/
               └─ /var/www/rukysite/current (symlink) → served by Caddy over HTTPS
```

- **Server:** Oracle Cloud Always Free VM, Ubuntu LTS.
- **Web server:** Caddy. It gets and renews the Let's Encrypt certificate itself.
- **Site:** a static export. There is no Node process on the server.
- **Releases:** each deploy is its own folder. The last five are kept, so a rollback is a symlink change.

| File | What it is |
| --- | --- |
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | Checks every pull request; deploys pushes to `main` |
| [`infra/server/setup.sh`](../infra/server/setup.sh) | One-time server setup and hardening |
| [`infra/caddy/Caddyfile`](../infra/caddy/Caddyfile) | Web server configuration: HTTPS, security headers, caching |
| [`infra/deploy.sh`](../infra/deploy.sh) | Builds and deploys from your own machine |
| [`infra/dns/setup-dns.sh`](../infra/dns/setup-dns.sh) | Sets up BIND as the DNS server for a delegated subdomain |
| [`.github/dependabot.yml`](../.github/dependabot.yml) | Weekly dependency update pull requests |

## First-time setup

### 1. Oracle Cloud

1. Create an Ubuntu LTS instance and add your own SSH public key when asked.
2. Reserve a public IP and attach it, so the address survives a rebuild.
3. In the subnet's **security list**, add ingress rules for TCP 80 and 443 from `0.0.0.0/0`. Port 22 is open by default; restrict it to your own IP if that IP is stable.

### 2. DNS

Create two records pointing at the server's public IP:

| Type | Name | Value |
| --- | --- | --- |
| A | `@` | server IP |
| A | `www` | server IP |

If the DNS is on Cloudflare, leave the proxy **off** (grey cloud) until Caddy has its certificate. If you turn it on afterwards, set SSL mode to **Full (strict)**.

### 3. Deploy key

On your own machine, create a key that is only used for deploys:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/rukysite_deploy -N "" -C "github-actions-deploy"
```

The private half (`rukysite_deploy`) goes into a GitHub secret in step 5. The public half (`rukysite_deploy.pub`) goes to the server in step 4.

### 4. Server

```bash
scp -r infra ~/.ssh/rukysite_deploy.pub ubuntu@<server ip>:~/
ssh ubuntu@<server ip>
sudo ~/infra/server/setup.sh <domain> <email> "$(cat ~/rukysite_deploy.pub)"
```

Keep that session open. In a second terminal, confirm you can still log in before closing it.

Then check the placeholder page loads at `https://<domain>`.

### 5. GitHub

In the repository, under **Settings → Secrets and variables → Actions**:

| Kind | Name | Value |
| --- | --- | --- |
| Secret | `DEPLOY_HOST` | server IP |
| Secret | `DEPLOY_SSH_KEY` | contents of `~/.ssh/rukysite_deploy` (the private key) |
| Secret | `DEPLOY_KNOWN_HOSTS` | output of `ssh-keyscan -t ed25519 <server ip>` |
| Variable | `SITE_URL` | `https://<domain>` with no trailing slash |
| Variable | `DEPLOY_ENABLED` | `true` |

Until `DEPLOY_ENABLED` is `true`, the workflow builds and checks but does not deploy.

Also worth switching on:

- **Settings → Branches:** protect `main`, require the "Lint, typecheck, build" check to pass.
- **Settings → Environments → production:** add yourself as a required reviewer if you want to approve each deploy.
- **Settings → Code security:** Dependabot alerts and secret scanning.

## Deploy

Merge to `main`. The workflow builds the site, uploads it as a new release, switches `current` to it, and then checks that `https://<domain>/version.txt` returns the commit it just deployed. If that check fails, the job fails.

While SSH on the server is limited to your own IP address, GitHub Actions cannot connect, so leave `DEPLOY_ENABLED` unset and deploy from your own machine instead. It builds, uploads and switches releases the same way:

```bash
DEPLOY_HOST=<server ip> SITE_URL=https://<domain> ./infra/deploy.sh
```

To see which commit is live:

```bash
curl https://<domain>/version.txt
```

## Roll back

```bash
ssh ubuntu@<server ip>
ls /var/www/rukysite/releases/            # newest is last
sudo -u deploy bash -c 'cd /var/www/rukysite && ln -s releases/<release name> current.new && mv -T current.new current'
```

The change is immediate; Caddy does not need a reload. The next push to `main` deploys on top as usual, so revert the bad commit too.

## Change the web server configuration

Edit [`infra/caddy/Caddyfile`](../infra/caddy/Caddyfile), copy `infra/` to the server again and re-run `setup.sh` with the same arguments. It validates the new file before replacing the old one.

## Rotate the deploy key

1. Create a new key pair (step 3 above).
2. On the server, replace the line in `/home/deploy/.ssh/authorized_keys` with the new public key.
3. Update the `DEPLOY_SSH_KEY` secret.
4. Re-run the last workflow to confirm deploys still work, then delete the old key files.

## Rebuild the server from nothing

1. Create a new instance and attach the reserved IP.
2. Run "Server" (step 4) again.
3. Update `DEPLOY_KNOWN_HOSTS`, because a new instance has a new host key.
4. Re-run the latest workflow on `main` to publish the site.

## Where to look when something is wrong

| Symptom | Check |
| --- | --- |
| Site unreachable | Oracle security list has 80/443; `sudo iptables -L INPUT -n --line-numbers` shows them above the REJECT rule; `systemctl status caddy` |
| Certificate errors | `journalctl -u caddy -n 100`: usually DNS not pointing here yet, or port 80 blocked |
| Deploy fails at SSH | `DEPLOY_KNOWN_HOSTS` out of date (server rebuilt), or wrong key in `DEPLOY_SSH_KEY` |
| Deploy fails at the version check | `SITE_URL` wrong, or a CDN in front is caching `version.txt` |
| Something on a page is missing | Browser console: the Content-Security-Policy in the Caddyfile may be blocking it |
| Who has been knocking on SSH | `sudo fail2ban-client status sshd` |
| Web traffic | `/var/log/caddy/access.log` (JSON) |
