#!/usr/bin/env bash
#
# Keep a small WordPress VM (1 GB of memory) from freezing when traffic or bots
# pile up. Run after setup-wordpress.sh (it calls this itself). Safe to run again.
#
#   sudo ./tune-memory.sh
#
# Without limits, Apache starts up to 150 PHP workers. Each can use a few dozen
# MB, so a burst of requests fills memory, the VM swaps nonstop, and it stops
# answering on every port until it is rebooted. This script:
#   1. caps Apache workers to what the memory can hold
#   2. shrinks MariaDB's caches
#   3. lowers PHP's per-request memory limit to 128M
#   4. makes the kernel prefer memory over swap (swappiness 10)
#   5. installs earlyoom, which ends the biggest process before the VM freezes
#   6. restarts Apache and MariaDB automatically if they are stopped that way

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
	echo "Run this with sudo." >&2
	exit 1
fi

step() { printf '\n==> %s\n' "$1"; }
export DEBIAN_FRONTEND=noninteractive

mem_mb="$(awk '/^MemTotal/ {print int($2 / 1024)}' /proc/meminfo)"
# Leave about 400 MB for MariaDB and the system; allow ~60 MB per PHP worker.
workers=$(( (mem_mb - 400) / 60 ))
(( workers < 4 )) && workers=4
(( workers > 40 )) && workers=40
echo "Memory: ${mem_mb} MB, Apache workers: ${workers}"

step "Capping Apache workers"
# mod_php runs under the prefork MPM: one process per request.
cat > /etc/apache2/conf-available/memory-limits.conf <<EOF
# Written by infra/wordpress/tune-memory.sh
<IfModule mpm_prefork_module>
	StartServers            2
	MinSpareServers         2
	MaxSpareServers         4
	ServerLimit             ${workers}
	MaxRequestWorkers       ${workers}
	# Recycle workers now and then, so PHP memory leaks cannot build up.
	MaxConnectionsPerChild  500
</IfModule>
# Do not hold a worker open waiting for slow clients.
KeepAliveTimeout 2
Timeout 60
EOF
a2enconf -q memory-limits

step "Shrinking MariaDB's caches"
cat > /etc/mysql/mariadb.conf.d/60-memory-limits.cnf <<'EOF'
# Written by infra/wordpress/tune-memory.sh
[mysqld]
innodb_buffer_pool_size = 64M
innodb_log_buffer_size  = 8M
key_buffer_size         = 8M
max_connections         = 30
tmp_table_size          = 16M
max_heap_table_size     = 16M
performance_schema      = OFF
EOF

step "Lowering PHP's memory limit per request"
for ini in /etc/php/*/apache2/conf.d/99-wordpress.ini; do
	[[ -f "$ini" ]] && sed -i 's/^memory_limit = .*/memory_limit = 128M/' "$ini"
done

step "Preferring memory over swap"
echo 'vm.swappiness = 10' > /etc/sysctl.d/60-swappiness.conf
sysctl -q -p /etc/sysctl.d/60-swappiness.conf

step "Installing earlyoom"
# The kernel's own out-of-memory killer acts too late on a VM with swap: by then
# it is already frozen. earlyoom acts while there is still room to recover.
apt-get -y install earlyoom
cat > /etc/default/earlyoom <<'EOF'
# Written by infra/wordpress/tune-memory.sh
# Act when free memory is under 5% and free swap under 10%.
# Prefer ending Apache/PHP workers; never touch sshd or systemd.
EARLYOOM_ARGS="-m 5 -s 10 -r 3600 --prefer ^(apache2|php) --avoid ^(sshd|systemd|systemd-journal)$"
EOF
systemctl enable --now earlyoom
systemctl restart earlyoom

step "Restarting Apache and MariaDB automatically"
for svc in apache2 mariadb; do
	install -d "/etc/systemd/system/$svc.service.d"
	cat > "/etc/systemd/system/$svc.service.d/restart.conf" <<'EOF'
# Written by infra/wordpress/tune-memory.sh
[Service]
Restart=on-failure
RestartSec=5
EOF
done
systemctl daemon-reload

step "Applying the changes"
apache2ctl configtest
systemctl restart mariadb
systemctl restart apache2
free -h

step "Done"
echo "Check https://<your site> loads, then watch memory for a while with: free -h; systemctl status earlyoom"
