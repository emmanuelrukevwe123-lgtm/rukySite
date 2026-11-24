#!/usr/bin/env bash
#
# Nightly backup for one server. setup-ops.sh installs it as
# /usr/local/sbin/ops-backup and runs it every night with a systemd timer.
#
#   sudo ops-backup
#
# Each run makes a folder /var/backups/ops/<UTC time>/ holding:
#   wordpress-db.sql.gz  the WordPress database (if WP_PATH is set)
#   files.tar.gz         BACKUP_PATHS, plus wp-content and wp-config.php
#   SHA256SUMS           checksums, to prove a copy is intact before restoring
# then copies it to Oracle Object Storage at <bucket>/<host>/<UTC time>/ and
# deletes copies older than LOCAL_KEEP_DAYS here and REMOTE_KEEP_DAYS there.
#
# If anything fails, NOTIFY_URL gets a message straight away.
# Restoring is described in docs/runbook.md, "Restore from a backup".

set -euo pipefail

# shellcheck source=lib.sh
source "${OPS_LIB:-/usr/local/lib/ops/lib.sh}"
load_conf

if [[ $EUID -ne 0 ]]; then
	echo "Run this with sudo." >&2
	exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-/var/backups/ops}"
LOCAL_KEEP_DAYS="${LOCAL_KEEP_DAYS:-3}"
REMOTE_KEEP_DAYS="${REMOTE_KEEP_DAYS:-30}"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
dest="$BACKUP_DIR/$stamp"

record() { # record <ok|failed> <where>
	mkdir -p "$OPS_STATE"
	echo "$(date +%s) $1 $2" >"$OPS_STATE/last-backup"
}
on_error() {
	record failed "-"
	notify "[FAIL] $HOST_LABEL backup" "The backup failed at line $1 of ops-backup.
Details: sudo journalctl -u ops-backup -n 50" warn
	ping_check "${BACKUP_PING_URL:-}" /fail
}
trap 'on_error $LINENO' ERR

umask 077
mkdir -p "$dest"
paths=()
for p in ${BACKUP_PATHS:-}; do
	if [[ -e "$p" ]]; then
		paths+=("$p")
	else
		echo "Skipping $p: it does not exist."
	fi
done

if [[ -n "${WP_PATH:-}" ]]; then
	echo "Dumping the WordPress database"
	# --single-transaction: a consistent copy without locking the site.
	wp_cli --quiet db export - --single-transaction | gzip >"$dest/wordpress-db.sql.gz"
	paths+=("$WP_PATH/wp-content" "$WP_PATH/wp-config.php")
fi

if ((${#paths[@]} > 0)); then
	echo "Archiving: ${paths[*]}"
	# Paths are stored without the leading /, so restoring with -C / puts them back.
	tar -C / -czf "$dest/files.tar.gz" \
		--exclude='wp-content/cache' --exclude='wp-content/upgrade' \
		"${paths[@]#/}"
fi
(cd "$dest" && sha256sum -- * >SHA256SUMS)
du -sh "$dest"

where=local-only
if [[ -n "${BACKUP_BUCKET:-}" ]]; then
	# rclone reads the remote "oci" from these variables, so no key sits in a second file.
	export RCLONE_CONFIG_OCI_TYPE=s3
	export RCLONE_CONFIG_OCI_PROVIDER=Other
	export RCLONE_CONFIG_OCI_ENDPOINT="$S3_ENDPOINT"
	export RCLONE_CONFIG_OCI_REGION="$S3_REGION"
	export RCLONE_CONFIG_OCI_ACCESS_KEY_ID="$S3_ACCESS_KEY"
	export RCLONE_CONFIG_OCI_SECRET_ACCESS_KEY="$S3_SECRET_KEY"
	export RCLONE_CONFIG_OCI_FORCE_PATH_STYLE=true
	export RCLONE_CONFIG_OCI_NO_CHECK_BUCKET=true

	remote="oci:$BACKUP_BUCKET/$HOST_LABEL"
	echo "Uploading to $remote/$stamp"
	rclone copy "$dest" "$remote/$stamp"
	rclone check "$dest" "$remote/$stamp" --one-way
	echo "Deleting remote copies older than $REMOTE_KEEP_DAYS days"
	rclone delete "$remote" --min-age "${REMOTE_KEEP_DAYS}d"
	where="bucket:$BACKUP_BUCKET"
fi

echo "Deleting local copies older than $LOCAL_KEEP_DAYS days"
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -mtime +"$((LOCAL_KEEP_DAYS - 1))" -exec rm -rf {} +

record ok "$where"
ping_check "${BACKUP_PING_URL:-}"
echo "Backup $stamp done ($where)."
