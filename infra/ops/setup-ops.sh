#!/usr/bin/env bash
#
# Install the daily health report and nightly backups on one server.
# Works on any of the Ubuntu servers (main site VM, WordPress VM, EC2).
# Safe to run again: it never overwrites /etc/ops/ops.conf once it exists.
#
#   sudo ./setup-ops.sh
#
# What it does:
#   1. installs the scripts: ops-health and ops-backup in /usr/local/sbin
#   2. writes /etc/ops/ops.conf from ops.conf.example (root only), if missing
#   3. installs rclone, for copying backups to Oracle Object Storage
#   4. adds systemd timers: backup 03:00, health report 07:00 (server time)
#   5. lets automatic updates reboot the server at 04:00 when a patch needs it
#   6. caps the system journal at 500 MB so logs cannot fill the disk
#   7. enlarges the firewall's connection table, so bots cannot fill it and
#      cut the server off the network
#
# Afterwards: edit /etc/ops/ops.conf, then test with
#   sudo ops-backup
#   sudo ops-health --no-notify

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
	echo "Run this with sudo." >&2
	exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
for f in lib.sh health-report.sh backup.sh ops.conf.example; do
	if [[ ! -f "$SCRIPT_DIR/$f" ]]; then
		echo "Cannot find $SCRIPT_DIR/$f. Copy the whole infra/ops folder to the server." >&2
		exit 1
	fi
done

step() { printf '\n==> %s\n' "$1"; }
export DEBIAN_FRONTEND=noninteractive

step "Installing rclone"
command -v rclone >/dev/null || { apt-get update && apt-get -y install rclone; }

step "Installing the scripts"
install -D -m 644 "$SCRIPT_DIR/lib.sh" /usr/local/lib/ops/lib.sh
install -m 755 "$SCRIPT_DIR/health-report.sh" /usr/local/sbin/ops-health
install -m 755 "$SCRIPT_DIR/backup.sh" /usr/local/sbin/ops-backup
install -d -m 750 /var/lib/ops /var/log/ops
install -d -m 700 /var/backups/ops

step "Writing /etc/ops/ops.conf (only if missing)"
install -d -m 700 /etc/ops
if [[ -f /etc/ops/ops.conf ]]; then
	echo "Kept the existing /etc/ops/ops.conf."
else
	install -m 600 "$SCRIPT_DIR/ops.conf.example" /etc/ops/ops.conf
	echo "Created /etc/ops/ops.conf. Edit it next."
fi

step "Adding the systemd services and timers"
cat >/etc/systemd/system/ops-backup.service <<'EOF'
[Unit]
Description=Nightly backup (infra/ops/backup.sh)
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/ops-backup
Nice=10
IOSchedulingClass=idle
EOF
cat >/etc/systemd/system/ops-backup.timer <<'EOF'
[Unit]
Description=Run the backup every night

[Timer]
OnCalendar=*-*-* 03:00
RandomizedDelaySec=10min
# If the server was off at 03:00, run as soon as it is back.
Persistent=true

[Install]
WantedBy=timers.target
EOF
cat >/etc/systemd/system/ops-health.service <<'EOF'
[Unit]
Description=Daily health report (infra/ops/health-report.sh)
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/ops-health
Nice=10
EOF
cat >/etc/systemd/system/ops-health.timer <<'EOF'
[Unit]
Description=Run the health report every morning

[Timer]
OnCalendar=*-*-* 07:00
Persistent=true

[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now ops-backup.timer ops-health.timer

step "Letting automatic updates reboot at 04:00 when needed"
# Kernel and library patches only take effect after a reboot. This reboots
# only when a patch asks for it, at 04:00, after the 03:00 backup.
cat >/etc/apt/apt.conf.d/52ops-reboot <<'EOF'
// Written by infra/ops/setup-ops.sh
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "04:00";
EOF

step "Capping the system journal at 500 MB"
install -d /etc/systemd/journald.conf.d
cat >/etc/systemd/journald.conf.d/50-ops.conf <<'EOF'
# Written by infra/ops/setup-ops.sh
[Journal]
SystemMaxUse=500M
EOF
systemctl restart systemd-journald

step "Enlarging the firewall's connection table"
# The firewall remembers every connection in the conntrack table. On a 1 GB VM
# Ubuntu allows only 7,680 entries and keeps an open TCP connection for 5 days,
# so scanners and bots fill it. When it is full the kernel drops every new
# packet ("nf_conntrack: table full") and the server stops answering on all
# ports, SSH included, while it otherwise runs fine. That is what took
# wp.manuelruky.dev down on 2026-11-19 and 2026-11-23.
# 65,536 entries use about 20 MB; idle connections are forgotten after an hour.
modprobe nf_conntrack
echo nf_conntrack >/etc/modules-load.d/ops-conntrack.conf
# Only ever raise the limit: some kernels (AWS's) already allow far more.
ct_max=65536
current_max="$(cat /proc/sys/net/netfilter/nf_conntrack_max)"
if ((current_max > ct_max)); then
	ct_max="$current_max"
fi
cat >/etc/sysctl.d/60-ops-conntrack.conf <<EOF
# Written by infra/ops/setup-ops.sh
net.netfilter.nf_conntrack_max = $ct_max
net.netfilter.nf_conntrack_tcp_timeout_established = 3600
net.netfilter.nf_conntrack_tcp_timeout_time_wait = 30
net.netfilter.nf_conntrack_tcp_timeout_close_wait = 30
net.netfilter.nf_conntrack_tcp_timeout_fin_wait = 30
EOF
sysctl -q -p /etc/sysctl.d/60-ops-conntrack.conf
echo "conntrack: $(cat /proc/sys/net/netfilter/nf_conntrack_count) of $(cat /proc/sys/net/netfilter/nf_conntrack_max) in use"

step "Done"
systemctl list-timers 'ops-*' --no-pager
cat <<DONE

Next:
  1. sudo nano /etc/ops/ops.conf     (alerts, services, sites, backup bucket)
  2. sudo ops-backup                 (first backup; check it finishes)
  3. sudo ops-health --no-notify     (read the report)
  4. sudo ops-health                 (check the summary reaches your phone)

Server time is $(date '+%R %Z'); the timers use it.
DONE
