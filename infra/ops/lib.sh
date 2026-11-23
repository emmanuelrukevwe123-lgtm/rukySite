# Shared by the ops scripts. setup-ops.sh installs it to /usr/local/lib/ops/lib.sh.
# shellcheck shell=bash

OPS_CONF="${OPS_CONF:-/etc/ops/ops.conf}"
OPS_STATE="${OPS_STATE:-/var/lib/ops}"
OPS_LOG="${OPS_LOG:-/var/log/ops}"

load_conf() {
	if [[ ! -r "$OPS_CONF" ]]; then
		echo "Cannot read $OPS_CONF. Run setup-ops.sh first (and use sudo)." >&2
		exit 1
	fi
	# shellcheck source=/dev/null
	source "$OPS_CONF"
	HOST_LABEL="${HOST_LABEL:-$(hostname -s)}"
}

# notify <title> <body> [ok|warn]
# Sends a short message to NOTIFY_URL: a Discord webhook, or an ntfy topic
# (https://ntfy.sh/<topic> or your own ntfy server). Does nothing if unset.
notify() {
	local title="$1" body="$2" level="${3:-ok}"
	[[ -n "${NOTIFY_URL:-}" ]] || return 0

	if [[ "$NOTIFY_URL" =~ ^https://(discord|discordapp)\.com/api/webhooks/ ]]; then
		local json
		json="$(python3 -c '
import json, sys
text = "**" + sys.argv[1] + "**\n" + sys.argv[2]
print(json.dumps({"content": text[:1990]}))' "$title" "$body")"
		curl -fsS -m 20 -H 'Content-Type: application/json' -d "$json" "$NOTIFY_URL" >/dev/null \
			|| echo "Could not send the Discord notification." >&2
	else
		local priority=default tags=white_check_mark
		if [[ "$level" == warn ]]; then
			priority=high
			tags=warning
		fi
		curl -fsS -m 20 -H "Title: $title" -H "Priority: $priority" -H "Tags: $tags" \
			--data-binary "$body" "$NOTIFY_URL" >/dev/null \
			|| echo "Could not send the ntfy notification." >&2
	fi
}

# ping_check <url> [/fail]
# Pings a dead-man's-switch check (healthchecks.io or similar). If the pings
# stop arriving, that service tells you, which covers "the server is down".
ping_check() {
	local url="${1:-}" suffix="${2:-}"
	[[ -n "$url" ]] || return 0
	curl -fsS -m 10 --retry 3 "$url$suffix" >/dev/null || true
}

# wp_cli <args...>: WP-CLI as the web server user, from the WordPress folder.
# (Run from a folder www-data cannot enter, some commands fail with
# "posix_spawn() failed: Permission denied".)
wp_cli() {
	(cd "$WP_PATH" && sudo -u www-data env WP_CLI_CACHE_DIR=/tmp/wp-cli-cache \
		/usr/local/bin/wp --path="$WP_PATH" "$@")
}
