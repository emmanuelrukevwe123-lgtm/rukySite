#!/usr/bin/env bash
#
# One-time setup and hardening for the Oracle Cloud VM (Ubuntu LTS).
# Safe to run again: every step checks before it changes anything.
#
#   sudo ./setup.sh <domain> <email> "<deploy public key>"
#
#   domain             bare domain the site is served on, e.g. manuelruky.me
#   email              address for Let's Encrypt expiry notices
#   deploy public key  the PUBLIC half of the key GitHub Actions deploys with
#                      (one line, starts with "ssh-ed25519 ...")
#
# What it does:
#   1. installs security updates and switches on automatic ones
#   2. creates a `deploy` user that can write the web root and nothing else
#   3. locks SSH down to keys only, no root login
#   4. opens ports 80 and 443 in the instance firewall
#   5. installs fail2ban to ban hosts that hammer SSH
#   6. installs Caddy and the site's Caddyfile
#
# Keep your current SSH session open while it runs, and test a second login
# before you close it.

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
	echo "Run this with sudo." >&2
	exit 1
fi
if [[ $# -ne 3 ]]; then
	echo "Usage: sudo $0 <domain> <email> \"<deploy public key>\"" >&2
	exit 1
fi

DOMAIN="$1"
EMAIL="$2"
DEPLOY_PUBKEY="$3"

ADMIN_USER="${SUDO_USER:-ubuntu}"
APP_DIR=/var/www/rukysite
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CADDYFILE_SRC="$SCRIPT_DIR/../caddy/Caddyfile"

if [[ ! "$DEPLOY_PUBKEY" =~ ^(ssh-ed25519|ssh-rsa|ecdsa-sha2-) ]]; then
	echo "The third argument must be an SSH public key (it starts with ssh-ed25519)." >&2
	exit 1
fi
if [[ ! "$EMAIL" =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]] || [[ "${EMAIL,,}" == your_email* ]]; then
	echo "The second argument must be a real email address; Let's Encrypt rejects placeholders." >&2
	exit 1
fi
if [[ ! -f "$CADDYFILE_SRC" ]]; then
	echo "Cannot find $CADDYFILE_SRC. Copy the whole infra/ folder to the server." >&2
	exit 1
fi
if [[ ! -s "/home/$ADMIN_USER/.ssh/authorized_keys" ]]; then
	echo "$ADMIN_USER has no SSH key installed; refusing to disable password logins." >&2
	exit 1
fi

step() { printf '\n==> %s\n' "$1"; }

export DEBIAN_FRONTEND=noninteractive

step "Installing updates and base packages"
apt-get update
apt-get -y upgrade
apt-get -y install unattended-upgrades fail2ban rsync curl gnupg \
	debian-keyring debian-archive-keyring apt-transport-https \
	iptables-persistent

step "Switching on automatic security updates"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF

step "Creating the deploy user and web root"
if ! id deploy &>/dev/null; then
	adduser --disabled-password --gecos "Site deploys" deploy
fi
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
printf '%s\n' "$DEPLOY_PUBKEY" > /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys

install -d -m 755 -o deploy -g deploy "$APP_DIR" "$APP_DIR/releases"
if [[ ! -e "$APP_DIR/current" ]]; then
	# Placeholder so Caddy has something to serve before the first deploy.
	install -d -m 755 -o deploy -g deploy "$APP_DIR/releases/00000000000000-placeholder"
	echo "<!doctype html><title>Coming soon</title><p>Coming soon.</p>" \
		> "$APP_DIR/releases/00000000000000-placeholder/index.html"
	ln -s releases/00000000000000-placeholder "$APP_DIR/current"
	chown -R deploy:deploy "$APP_DIR"
fi

step "Hardening SSH"
# sshd uses the first value it reads, so this file is named to sort first.
cat > /etc/ssh/sshd_config.d/00-hardening.conf <<EOF
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
X11Forwarding no
MaxAuthTries 3
AllowUsers $ADMIN_USER deploy
EOF
# Only reload if the configuration is valid, so a typo cannot lock us out.
sshd -t
systemctl reload ssh || systemctl restart ssh

step "Opening ports 80 and 443 in the instance firewall"
# Oracle's Ubuntu images ship iptables rules that end in a REJECT. New rules
# have to go in front of it. (Do not use ufw on these images; it conflicts.)
open_port() {
	local port="$1"
	if iptables -C INPUT -p tcp --dport "$port" -m state --state NEW -j ACCEPT 2>/dev/null; then
		return
	fi
	local reject_line
	reject_line="$(iptables -L INPUT --line-numbers -n | awk '$2 == "REJECT" {print $1; exit}')"
	if [[ -n "$reject_line" ]]; then
		iptables -I INPUT "$reject_line" -p tcp --dport "$port" -m state --state NEW -j ACCEPT
	else
		iptables -A INPUT -p tcp --dport "$port" -m state --state NEW -j ACCEPT
	fi
}
open_port 80
open_port 443
netfilter-persistent save

step "Configuring fail2ban"
cat > /etc/fail2ban/jail.local <<'EOF'
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
EOF
systemctl enable --now fail2ban
systemctl restart fail2ban

step "Installing Caddy"
if ! command -v caddy &>/dev/null; then
	curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
		| gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
	curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
		> /etc/apt/sources.list.d/caddy-stable.list
	chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg /etc/apt/sources.list.d/caddy-stable.list
	apt-get update
	apt-get -y install caddy
fi

step "Installing the Caddyfile for $DOMAIN"
sed -e "s/SITE_DOMAIN/$DOMAIN/g" -e "s/ACME_EMAIL/$EMAIL/g" "$CADDYFILE_SRC" > /etc/caddy/Caddyfile.new
caddy validate --adapter caddyfile --config /etc/caddy/Caddyfile.new
mv /etc/caddy/Caddyfile.new /etc/caddy/Caddyfile
# Validating as root creates the access log owned by root, which the caddy
# user then cannot open. Hand the log folder back before starting the service.
chown -R caddy:caddy /var/log/caddy
systemctl enable caddy
systemctl reload caddy || systemctl restart caddy
sleep 3
if ! systemctl is-active --quiet caddy; then
	echo "Caddy failed to start. Its last log lines:" >&2
	journalctl -u caddy -n 15 --no-pager >&2
	exit 1
fi

step "Done"
cat <<EOF
Server is set up for https://$DOMAIN

Before closing this session, open a second terminal and check you can still log in:
  ssh $ADMIN_USER@<server ip>

Host key to store in the GitHub secret DEPLOY_KNOWN_HOSTS (run from your own machine):
  ssh-keyscan -t ed25519 <server ip>

Caddy gets its certificate once the DNS A record for $DOMAIN points at this server
and ports 80/443 are open in the Oracle security list. Watch it with:
  journalctl -u caddy -f
EOF
