#!/usr/bin/env bash
#
# Install the hourly tech-news job on the main site VM. Safe to run again.
#
#   sudo ./setup-news.sh
#
# What it does:
#   1. creates a system user, "news", that can only write the news folder
#   2. installs fetch-news.py (next to this script) in /usr/local/lib/rukysite-news
#   3. adds a systemd service and an hourly timer that run it as that user,
#      locked down so it cannot touch anything else on the server
#   4. tells Caddy to serve the result at /news.json
#   5. runs it once, so the page has headlines straight away

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
	echo "Run this with sudo." >&2
	exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR=/usr/local/lib/rukysite-news
OUT_DIR=/var/www/rukysite/news
CADDYFILE=/etc/caddy/Caddyfile

step() { printf '\n==> %s\n' "$1"; }

if [[ ! -f "$SCRIPT_DIR/fetch-news.py" ]]; then
	echo "fetch-news.py is not next to this script. Copy the whole infra/news folder." >&2
	exit 1
fi

step "Creating the news user and folder"
# A system user with no shell and no home: if the script were ever tricked by
# a bad feed, it could only write one folder of headlines.
id news &>/dev/null || useradd --system --no-create-home --shell /usr/sbin/nologin news
install -d -o news -g news -m 755 "$OUT_DIR"

step "Installing the fetcher"
install -d -m 755 "$LIB_DIR"
install -m 755 "$SCRIPT_DIR/fetch-news.py" "$LIB_DIR/fetch-news.py"

step "Adding the service and the hourly timer"
cat >/etc/systemd/system/news-fetch.service <<EOF
# Written by infra/news/setup-news.sh
[Unit]
Description=Fetch tech news headlines for the site
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
User=news
Group=news
ExecStart=/usr/bin/python3 -I $LIB_DIR/fetch-news.py $OUT_DIR/news.json
TimeoutStartSec=3min

# Sandbox: read-only system, no home folders, no devices, no privilege gain,
# internet access only, and write access to the news folder alone.
NoNewPrivileges=yes
ProtectSystem=strict
ReadWritePaths=$OUT_DIR
ProtectHome=yes
PrivateTmp=yes
PrivateDevices=yes
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectControlGroups=yes
RestrictAddressFamilies=AF_INET AF_INET6
RestrictNamespaces=yes
LockPersonality=yes
MemoryMax=150M
EOF

cat >/etc/systemd/system/news-fetch.timer <<'EOF'
# Written by infra/news/setup-news.sh
[Unit]
Description=Fetch tech news headlines every hour

[Timer]
OnBootSec=2min
OnCalendar=hourly
# Spread the requests a little, so the feeds do not all see us on the hour.
RandomizedDelaySec=5min
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now news-fetch.timer

step "Serving /news.json from Caddy"
# The site's own folder is replaced on every deploy, so the headlines live in
# their own folder and Caddy maps /news.json to it.
if grep -q '/news.json' "$CADDYFILE"; then
	echo "Already in $CADDYFILE"
else
	cp "$CADDYFILE" "$CADDYFILE.bak-news"
	awk -v out="$OUT_DIR" '
		{ print }
		!done && /^[[:space:]]*root \* \/var\/www\/rukysite\/current/ {
			print ""
			print "\t# Tech news headlines, refreshed hourly by news-fetch.timer (infra/news)."
			print "\thandle /news.json {"
			print "\t\troot * " out
			print "\t\theader Cache-Control \"public, max-age=300\""
			print "\t\tfile_server"
			print "\t}"
			done = 1
		}
	' "$CADDYFILE.bak-news" >"$CADDYFILE.new"
	if ! grep -q '/news.json' "$CADDYFILE.new"; then
		rm "$CADDYFILE.new"
		echo "Could not find the site's root line in $CADDYFILE; add the /news.json block by hand (see infra/caddy/Caddyfile)." >&2
		exit 1
	fi
	if caddy validate --adapter caddyfile --config "$CADDYFILE.new" >/dev/null; then
		mv "$CADDYFILE.new" "$CADDYFILE"
		systemctl reload caddy
		echo "Added; the old file is $CADDYFILE.bak-news"
	else
		rm "$CADDYFILE.new"
		echo "The new Caddyfile did not validate; nothing was changed." >&2
		exit 1
	fi
fi

step "Fetching headlines now"
systemctl start news-fetch.service
journalctl -u news-fetch.service -n 10 --no-pager -o cat
ls -l "$OUT_DIR/news.json"

step "Done"
systemctl list-timers news-fetch.timer --no-pager
cat <<'DONE'

Useful commands:
  systemctl list-timers news-fetch.timer      next run
  sudo systemctl start news-fetch.service     fetch now
  journalctl -u news-fetch.service -n 20      what the last runs said
DONE
