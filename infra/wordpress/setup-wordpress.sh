#!/usr/bin/env bash
#
# Install WordPress on a fresh Ubuntu VM (Oracle Cloud or AWS EC2), on a LAMP stack:
# Linux, Apache, MariaDB, PHP. Adds HTTPS with Let's Encrypt and WP-CLI.
# Safe to run again.
#
#   sudo ./setup-wordpress.sh <domain> <email>
#
#   domain  the address the site will use, e.g. wp.manuelruky.dev
#           (its DNS A record must already point at this VM for HTTPS)
#   email   for Let's Encrypt certificate expiry notices
#
# What it does:
#   1. installs updates, automatic security updates and fail2ban
#   2. adds 2 GB of swap (the free VM only has 1 GB of memory)
#   3. installs Apache, MariaDB and PHP
#   4. creates the WordPress database and a database user with a random password
#   5. downloads WordPress, checks its checksum, and writes wp-config.php
#   6. opens ports 80 and 443 in the instance firewall
#   7. gets an HTTPS certificate and redirects HTTP to HTTPS
#   8. installs WP-CLI, for managing WordPress over SSH
#   9. runs tune-memory.sh (next to this script) so the small VM cannot freeze
#  10. runs harden-wordpress.sh (next to this script) to hide usernames and the version

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
	echo "Run this with sudo." >&2
	exit 1
fi
if [[ $# -ne 2 ]]; then
	echo "Usage: sudo $0 <domain> <email>" >&2
	exit 1
fi

DOMAIN="$1"
EMAIL="$2"
WP_DIR=/var/www/wordpress
DB_NAME=wordpress
DB_USER=wpuser

if [[ ! "$DOMAIN" =~ ^([a-z0-9-]+\.)+[a-z]{2,}$ ]]; then
	echo "The domain must look like wp.example.dev (lower case)." >&2
	exit 1
fi
if [[ ! "$EMAIL" =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]] || [[ "${EMAIL,,}" == your_email* ]]; then
	echo "The second argument must be a real email address; Let's Encrypt rejects placeholders." >&2
	exit 1
fi

step() { printf '\n==> %s\n' "$1"; }
export DEBIAN_FRONTEND=noninteractive

step "Installing updates and base packages"
apt-get update
apt-get -y upgrade
apt-get -y install unattended-upgrades fail2ban iptables-persistent curl unzip
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF
systemctl enable --now fail2ban

step "Adding 2 GB of swap"
# With only 1 GB of memory, MariaDB and PHP can run out; swap is the safety net.
if ! swapon --show | grep -q /swapfile; then
	if [[ ! -f /swapfile ]]; then
		fallocate -l 2G /swapfile
		chmod 600 /swapfile
		mkswap /swapfile
	fi
	swapon /swapfile
	grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
free -h

step "Installing Apache, MariaDB and PHP"
apt-get -y install apache2 mariadb-server \
	php php-cli libapache2-mod-php php-mysql php-curl php-gd php-mbstring php-xml php-zip php-intl \
	certbot python3-certbot-apache

step "Securing MariaDB and creating the WordPress database"
# Ubuntu's MariaDB root account logs in through the system root user only (no password).
# This does what mysql_secure_installation does, without the questions.
mysql <<'SQL'
DELETE FROM mysql.global_priv WHERE User = '';
DROP DATABASE IF EXISTS test;
DELETE FROM mysql.db WHERE Db = 'test' OR Db = 'test\_%';
FLUSH PRIVILEGES;
SQL
if [[ -f "$WP_DIR/wp-config.php" ]]; then
	DB_PASS="$(grep -oP "define\(\s*'DB_PASSWORD',\s*'\K[^']+" "$WP_DIR/wp-config.php")"
else
	DB_PASS="$(openssl rand -base64 24 | tr -d '/+=')"
fi
mysql <<SQL
CREATE DATABASE IF NOT EXISTS $DB_NAME DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
ALTER USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
SQL

step "Downloading WordPress"
if [[ ! -f "$WP_DIR/wp-settings.php" ]]; then
	tmp="$(mktemp -d)"
	curl -fsSL -o "$tmp/latest.tar.gz" https://wordpress.org/latest.tar.gz
	curl -fsSL -o "$tmp/latest.tar.gz.sha1" https://wordpress.org/latest.tar.gz.sha1
	# Make sure the download is exactly what wordpress.org published.
	echo "$(cat "$tmp/latest.tar.gz.sha1")  $tmp/latest.tar.gz" | sha1sum -c -
	tar -xzf "$tmp/latest.tar.gz" -C "$tmp"
	install -d "$WP_DIR"
	cp -a "$tmp/wordpress/." "$WP_DIR/"
	rm -rf "$tmp"
fi

step "Writing wp-config.php"
if [[ ! -f "$WP_DIR/wp-config.php" ]]; then
	salt() { openssl rand -base64 48 | tr -d '\n/+='; }
	cat > "$WP_DIR/wp-config.php" <<EOF
<?php
// Written by infra/wordpress/setup-wordpress.sh
define( 'DB_NAME', '$DB_NAME' );
define( 'DB_USER', '$DB_USER' );
define( 'DB_PASSWORD', '$DB_PASS' );
define( 'DB_HOST', 'localhost' );
define( 'DB_CHARSET', 'utf8mb4' );
define( 'DB_COLLATE', '' );

// Unique random keys that protect login cookies.
define( 'AUTH_KEY',         '$(salt)' );
define( 'SECURE_AUTH_KEY',  '$(salt)' );
define( 'LOGGED_IN_KEY',    '$(salt)' );
define( 'NONCE_KEY',        '$(salt)' );
define( 'AUTH_SALT',        '$(salt)' );
define( 'SECURE_AUTH_SALT', '$(salt)' );
define( 'LOGGED_IN_SALT',   '$(salt)' );
define( 'NONCE_SALT',       '$(salt)' );

\$table_prefix = 'wp_';

define( 'WP_DEBUG', false );
// Log-ins and the dashboard only over HTTPS.
define( 'FORCE_SSL_ADMIN', true );
// No file editor in the dashboard: a stolen admin password cannot rewrite PHP files.
define( 'DISALLOW_FILE_EDIT', true );
define( 'FS_METHOD', 'direct' );

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}
require_once ABSPATH . 'wp-settings.php';
EOF
fi
chown -R www-data:www-data "$WP_DIR"
find "$WP_DIR" -type d -exec chmod 755 {} +
find "$WP_DIR" -type f -exec chmod 644 {} +
chmod 640 "$WP_DIR/wp-config.php"

step "Configuring PHP"
for dir in /etc/php/*/apache2/conf.d; do
	cat > "$dir/99-wordpress.ini" <<'EOF'
upload_max_filesize = 64M
post_max_size = 64M
memory_limit = 256M
max_execution_time = 120
expose_php = Off
EOF
done

step "Configuring Apache"
cat > /etc/apache2/sites-available/wordpress.conf <<EOF
<VirtualHost *:80>
	ServerName $DOMAIN
	DocumentRoot $WP_DIR

	<Directory $WP_DIR>
		# WordPress's .htaccess handles pretty links, so it may override settings.
		AllowOverride All
		Require all granted
		Options -Indexes +FollowSymLinks
	</Directory>

	ErrorLog \${APACHE_LOG_DIR}/wordpress-error.log
	CustomLog \${APACHE_LOG_DIR}/wordpress-access.log combined
</VirtualHost>
EOF
# Do not announce the Apache version or operating system.
sed -i -e 's/^ServerTokens .*/ServerTokens Prod/' -e 's/^ServerSignature .*/ServerSignature Off/' \
	/etc/apache2/conf-available/security.conf
a2enmod -q rewrite headers
a2dissite -q 000-default || true
a2ensite -q wordpress
apache2ctl configtest
systemctl reload apache2

step "Opening ports 80 and 443 in the instance firewall"
# Oracle's Ubuntu images end the INPUT chain with a REJECT rule; insert above it.
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

step "Getting an HTTPS certificate for $DOMAIN"
public_ip="$(curl -fsS --max-time 10 https://api.ipify.org || true)"
dns_ip="$(getent ahostsv4 "$DOMAIN" | awk 'NR == 1 {print $1}' || true)"
if [[ -n "$public_ip" && "$dns_ip" == "$public_ip" ]]; then
	certbot --apache -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect
	https_ready=yes
else
	echo "Skipping HTTPS for now: $DOMAIN resolves to '${dns_ip:-nothing}', but this VM is '${public_ip:-unknown}'." >&2
	echo "Fix the DNS A record, wait a few minutes, then run this script again." >&2
	https_ready=no
fi

step "Installing WP-CLI (manage WordPress from SSH)"
if ! command -v wp &>/dev/null; then
	curl -fsSL -o /usr/local/bin/wp https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
	chmod 755 /usr/local/bin/wp
fi
sudo -u www-data wp --path="$WP_DIR" --version

step "Limiting memory use"
tune="$(dirname "$0")/tune-memory.sh"
if [[ -f "$tune" ]]; then
	bash "$tune"
else
	echo "tune-memory.sh is not next to this script; copy it over and run it." >&2
fi

step "Hardening WordPress"
harden="$(dirname "$0")/harden-wordpress.sh"
if [[ -f "$harden" ]]; then
	bash "$harden"
else
	echo "harden-wordpress.sh is not next to this script; copy it over and run it after the browser install." >&2
fi

step "Done"
if [[ "$https_ready" == yes ]]; then
	url="https://$DOMAIN"
else
	url="http://$public_ip"
fi
cat <<DONE
WordPress is installed in $WP_DIR.

Finish in your browser: open $url and fill in the site title, an admin
username, a strong password and your email. Then run harden-wordpress.sh
again, so your public name is not your login name.

Database: $DB_NAME, user $DB_USER (the password is in $WP_DIR/wp-config.php).

Manage it over SSH with WP-CLI, for example:
  sudo -u www-data wp --path=$WP_DIR core version
  sudo -u www-data wp --path=$WP_DIR plugin list
DONE
