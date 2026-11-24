#!/usr/bin/env bash
#
# Daily health report for one server. setup-ops.sh installs it as
# /usr/local/sbin/ops-health and runs it every morning with a systemd timer.
#
#   sudo ops-health              check, save the report, send the summary
#   sudo ops-health --no-notify  check and print only (for testing)
#
# Checks: disk, memory, failed services, pending updates and reboots, automatic
# updates, fail2ban and SSH logins, site status and certificate expiry,
# WordPress updates and file checksums, WordPress admin accounts, last backup.
#
# The full report is saved to /var/log/ops/health-<date>.txt (kept 30 days).
# The summary goes to NOTIFY_URL: one line when all is well, the list of
# problems when not.

set -uo pipefail # no -e: one failing check must not stop the rest of the report

# shellcheck source=lib.sh
source "${OPS_LIB:-/usr/local/lib/ops/lib.sh}"

send=yes
[[ "${1:-}" == --no-notify ]] && send=no

load_conf
DISK_WARN_PCT="${DISK_WARN_PCT:-80}"
MEM_WARN_PCT="${MEM_WARN_PCT:-90}"
CERT_WARN_DAYS="${CERT_WARN_DAYS:-14}"

now="$(date +%s)"
warnings=()
summary=()
warn() { warnings+=("$1"); }
section() { printf '\n## %s\n\n' "$1"; }
age_hours() { echo $(((now - $(stat -c %Y "$1")) / 3600)); }

check_system() {
	section "System"
	echo "Uptime:  $(uptime -p)"
	echo "Load:    $(cut -d' ' -f1-3 /proc/loadavg) ($(nproc) CPUs)"
	echo "Kernel:  $(uname -r)"
	echo "OS:      $(. /etc/os-release && echo "$PRETTY_NAME")"
}

check_disk() {
	section "Disk"
	local types=(-x tmpfs -x devtmpfs -x squashfs -x fuse.snapfuse -x overlay -x efivarfs)
	df -hP "${types[@]}"
	local pct mount
	while read -r pct mount; do
		pct="${pct%\%}"
		if ((pct >= DISK_WARN_PCT)); then
			warn "Disk $mount is ${pct}% full"
		fi
		[[ "$mount" == / ]] && summary+=("disk ${pct}%")
	done < <(df --output=pcent,target "${types[@]}" | tail -n +2)

	echo
	journalctl --disk-usage 2>/dev/null
	echo
	echo "Largest under /var/log:"
	du -xsh /var/log/* 2>/dev/null | sort -rh | head -5
}

check_memory() {
	section "Memory"
	free -h
	local total avail swap_total swap_free used_pct
	total="$(awk '/^MemTotal:/ {print $2}' /proc/meminfo)"
	avail="$(awk '/^MemAvailable:/ {print $2}' /proc/meminfo)"
	used_pct=$((100 - avail * 100 / total))
	summary+=("memory ${used_pct}%")
	if ((used_pct >= MEM_WARN_PCT)); then
		warn "Memory is ${used_pct}% used"
	fi
	swap_total="$(awk '/^SwapTotal:/ {print $2}' /proc/meminfo)"
	swap_free="$(awk '/^SwapFree:/ {print $2}' /proc/meminfo)"
	if ((swap_total > 0)) && (((swap_total - swap_free) * 100 / swap_total >= 50)); then
		warn "Swap is more than half used: the server is short of memory"
	fi

	# A full connection table silently drops every new packet.
	local ct_count ct_max ct_full
	if [[ -r /proc/sys/net/netfilter/nf_conntrack_count ]]; then
		ct_count="$(cat /proc/sys/net/netfilter/nf_conntrack_count)"
		ct_max="$(cat /proc/sys/net/netfilter/nf_conntrack_max)"
		echo
		echo "Firewall connection table: $ct_count of $ct_max"
		if ((ct_count * 100 / ct_max >= 70)); then
			warn "Firewall connection table is $((ct_count * 100 / ct_max))% full"
		fi
		ct_full="$(journalctl -k --since '-24h' --no-pager 2>/dev/null | grep -c 'table full' || true)"
		if ((ct_full > 0)); then
			warn "Firewall connection table overflowed $ct_full times in 24h: packets were dropped"
		fi
	fi
}

check_services() {
	section "Services"
	local failed
	failed="$(systemctl --failed --no-legend --plain | awk '{print $1}')"
	if [[ -n "$failed" ]]; then
		echo "Failed:"
		echo "$failed"
		warn "Failed services: $(echo "$failed" | tr '\n' ' ')"
	else
		echo "No failed services."
	fi
	echo
	local svc state
	for svc in ${WATCH_SERVICES:-}; do
		state="$(systemctl is-active "$svc" 2>/dev/null)"
		printf '%-20s %s\n' "$svc" "$state"
		[[ "$state" == active ]] || warn "$svc is $state"
	done
}

check_updates() {
	section "Updates"
	local upgradable count security
	upgradable="$(apt list --upgradable 2>/dev/null | tail -n +2)"
	count="$(grep -c . <<<"$upgradable")"
	security="$(grep -c -- '-security' <<<"$upgradable")"
	echo "Packages with updates: $count ($security from the security archive)"
	[[ -n "$upgradable" ]] && echo "$upgradable" | head -20
	summary+=("$count updates")

	local stamp=/var/lib/apt/periodic/unattended-upgrades-stamp
	echo
	if [[ -f "$stamp" ]]; then
		echo "Automatic updates last ran $(age_hours "$stamp") hours ago."
		if (($(age_hours "$stamp") > 48)); then
			warn "Automatic updates have not run for $(age_hours "$stamp") hours"
		fi
	else
		warn "Automatic updates have never run (is unattended-upgrades installed?)"
	fi
	if ((security > 0)) && [[ -f "$stamp" ]] && (($(age_hours "$stamp") > 24)); then
		warn "$security security updates are waiting"
	fi

	if [[ -f /var/run/reboot-required ]]; then
		echo "A reboot is needed for: $(sort -u /var/run/reboot-required.pkgs 2>/dev/null | tr '\n' ' ')"
		# Automatic updates reboot at 04:00, so a fresh flag is expected; an old one is not.
		if (($(age_hours /var/run/reboot-required) > 24)); then
			warn "A reboot has been waiting for $(age_hours /var/run/reboot-required) hours"
		fi
	else
		echo "No reboot needed."
	fi
}

check_access() {
	section "SSH and fail2ban (last 24 hours)"
	local log attempts
	log="$(journalctl --since '24 hours ago' -t sshd -t sshd-session --no-pager -q 2>/dev/null)"
	attempts="$(grep -cE 'Invalid user|Failed (password|publickey)|authenticating user .* \[preauth\]' <<<"$log")"
	echo "Failed or refused SSH attempts: $attempts"
	echo
	echo "Successful SSH logins (count, user, address):"
	grep 'Accepted ' <<<"$log" |
		awk '{for (i = 1; i < NF; i++) {if ($i == "for") u = $(i + 1); if ($i == "from") a = $(i + 1)} print u, a}' |
		sort | uniq -c | sort -rn || true
	echo

	if ! command -v fail2ban-client >/dev/null; then
		warn "fail2ban is not installed"
		return
	fi
	local jails jail status
	jails="$(fail2ban-client status 2>/dev/null | sed -n 's/.*Jail list:[[:space:]]*//p' | tr ',' ' ')"
	if [[ -z "$jails" ]]; then
		warn "fail2ban has no active jails"
		return
	fi
	for jail in $jails; do
		status="$(fail2ban-client status "$jail")"
		printf '%-16s banned now: %s, banned in total: %s\n' "$jail" \
			"$(grep -oP 'Currently banned:\s*\K\d+' <<<"$status")" \
			"$(grep -oP 'Total banned:\s*\K\d+' <<<"$status")"
	done
}

check_sites() {
	[[ -n "${SITES:-}" ]] || return
	section "Sites and certificates"
	local entry host port code end days
	for entry in $SITES; do
		host="${entry%%:*}"
		port=443
		[[ "$entry" == *:* ]] && port="${entry##*:}"

		code="-"
		if [[ "$port" == 443 ]]; then
			code="$(curl -s -o /dev/null -m 15 -w '%{http_code}' "https://$host/")"
			[[ "$code" =~ ^[23] ]] || warn "https://$host/ answered HTTP $code"
		fi

		end="$(timeout 15 openssl s_client -connect "$host:$port" -servername "$host" </dev/null 2>/dev/null |
			openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)"
		if [[ -n "$end" ]]; then
			days=$((($(date -d "$end" +%s) - now) / 86400))
			((days < CERT_WARN_DAYS)) && warn "Certificate for $host:$port expires in $days days"
		else
			days="?"
			warn "Could not read the certificate for $host:$port"
		fi
		printf '%-34s HTTP %-4s certificate expires in %s days\n' "$host:$port" "$code" "$days"
	done
}

check_wordpress() {
	[[ -n "${WP_PATH:-}" ]] || return
	section "WordPress ($WP_PATH)"
	if ! wp_cli core is-installed 2>/dev/null; then
		warn "WP-CLI cannot read WordPress in $WP_PATH"
		return
	fi
	# --skip-plugins/--skip-themes: a broken plugin must not break the report.
	local wp=(--skip-plugins --skip-themes --quiet)
	local core_update plugins themes
	echo "WordPress $(wp_cli "${wp[@]}" core version)"

	core_update="$(wp_cli "${wp[@]}" core check-update --field=version 2>/dev/null | sort -uV | tail -1)"
	if [[ -n "$core_update" ]]; then
		echo "Core update available: $core_update"
		warn "WordPress $core_update is available"
	else
		echo "Core is up to date."
	fi

	plugins="$(wp_cli "${wp[@]}" plugin list --update=available --field=name 2>/dev/null)"
	themes="$(wp_cli "${wp[@]}" theme list --update=available --field=name 2>/dev/null)"
	echo "Plugins with updates: ${plugins:-none}"
	echo "Themes with updates:  ${themes:-none}"
	[[ -n "$plugins" ]] && warn "Plugin updates: $(echo "$plugins" | tr '\n' ' ')"
	[[ -n "$themes" ]] && warn "Theme updates: $(echo "$themes" | tr '\n' ' ')"

	# Files that differ from what wordpress.org published can mean tampering.
	echo
	if wp_cli "${wp[@]}" core verify-checksums >/dev/null 2>&1; then
		echo "Core files match wordpress.org."
	else
		echo "Core checksum check FAILED. Details: sudo -u www-data wp --path=$WP_PATH core verify-checksums"
		warn "WordPress core files do not match wordpress.org"
	fi
	if wp_cli "${wp[@]}" plugin verify-checksums --all >/dev/null 2>&1; then
		echo "Plugin files match wordpress.org (plugins not from wordpress.org are skipped)."
	else
		echo "Plugin checksum check FAILED. Details: sudo -u www-data wp --path=$WP_PATH plugin verify-checksums --all"
		warn "WordPress plugin files do not match wordpress.org"
	fi

	# Administrators: the first run records them; a new one later is a warning.
	local admins known="$OPS_STATE/wp-admins" new
	admins="$(wp_cli "${wp[@]}" user list --role=administrator --field=user_login 2>/dev/null | sort)"
	echo
	echo "Administrators: $(echo "$admins" | tr '\n' ' ')"
	if [[ -f "$known" ]]; then
		new="$(comm -13 "$known" <(echo "$admins"))"
		if [[ -n "$new" ]]; then
			warn "New WordPress administrator(s): $(echo "$new" | tr '\n' ' ') (if expected: echo \"$admins\" | sudo tee $known)"
		fi
	else
		echo "$admins" >"$known"
		echo "(Recorded as the known administrators.)"
	fi
}

check_backup() {
	section "Backups"
	local file="$OPS_STATE/last-backup" ts status where hours
	if [[ ! -r "$file" ]]; then
		warn "No backup has run yet"
		return
	fi
	read -r ts status where <"$file"
	hours=$(((now - ts) / 3600))
	echo "Last backup: $(date -d "@$ts" '+%F %R'), $hours hours ago, $status, stored: $where"
	summary+=("backup ${hours}h ago")
	[[ "$status" == ok ]] || warn "The last backup failed (sudo journalctl -u ops-backup)"
	((hours > 26)) && warn "The last backup is $hours hours old"
	[[ "$where" == local-only ]] && warn "Backups are only on this server: set BACKUP_BUCKET"
}

mkdir -p "$OPS_LOG" "$OPS_STATE"
report="$OPS_LOG/health-$(date +%F).txt"
body="$(mktemp)"
trap 'rm -f "$body"' EXIT

{
	check_system
	check_disk
	check_memory
	check_services
	check_updates
	check_access
	check_sites
	check_wordpress
	check_backup
} >"$body" 2>&1

if ((${#warnings[@]} == 0)); then
	status_line="OK"
	title="[OK] $HOST_LABEL daily health"
	level=ok
else
	status_line="${#warnings[@]} warning(s)"
	title="[WARN] $HOST_LABEL: ${#warnings[@]} warning(s)"
	level=warn
fi

{
	echo "# Health report: $HOST_LABEL, $(date '+%F %R %Z')"
	echo
	echo "Status: $status_line"
	for w in "${warnings[@]}"; do echo "- $w"; done
	cat "$body"
} >"$report"
chmod 640 "$report"
find "$OPS_LOG" -name 'health-*.txt' -mtime +30 -delete

if [[ "$send" == no ]]; then
	cat "$report"
	exit 0
fi

if [[ "$level" == ok ]]; then
	message="All checks passed: $(IFS=,; echo "${summary[*]}" | sed 's/,/, /g')."
else
	message="$(printf -- '- %s\n' "${warnings[@]}")"
fi
notify "$title" "$message
Full report: sudo cat $report" "$level"

if [[ -n "${MAIL_TO:-}" ]] && command -v sendmail >/dev/null; then
	{
		echo "To: $MAIL_TO"
		echo "Subject: $title"
		echo "Content-Type: text/plain; charset=utf-8"
		echo
		cat "$report"
	} | sendmail -t
fi

ping_check "${HEALTH_PING_URL:-}"
echo "$title (report: $report)"
