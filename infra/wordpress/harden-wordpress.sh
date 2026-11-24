#!/usr/bin/env bash
#
# Stop a WordPress site from handing out details an attacker can use:
# usernames, the WordPress version, and an unlimited password-guessing door.
# Run after setup-wordpress.sh (it calls this itself). Safe to run again.
#
#   sudo ./harden-wordpress.sh [public name]
#
#   public name  the name shown on posts instead of the login name
#                (default "Author <id>")
#
# What it does:
#   1. hides users from visitors: the REST user list, ?author=N, author pages,
#      the users sitemap and the author fields in oEmbed
#   2. gives each user a public name that is not their login name
#   3. turns off XML-RPC (password guessing in bulk) and blocks it in Apache
#   4. hides the WordPress version (generator tag, readme.html, ?ver= on files)
#   5. bans addresses that keep failing to log in, with fail2ban

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
	echo "Run this with sudo." >&2
	exit 1
fi

WP_DIR=/var/www/wordpress
PUBLIC_NAME="${1:-}"
wp() { sudo -u www-data /usr/local/bin/wp --path="$WP_DIR" "$@"; }
step() { printf '\n==> %s\n' "$1"; }

if [[ ! -f "$WP_DIR/wp-config.php" ]]; then
	echo "No WordPress in $WP_DIR; run setup-wordpress.sh first." >&2
	exit 1
fi

step "Installing a must-use plugin that hides users and the version"
# Must-use plugins load on every request and cannot be switched off in the dashboard.
install -d -o www-data -g www-data "$WP_DIR/wp-content/mu-plugins"
cat > "$WP_DIR/wp-content/mu-plugins/hide-setup.php" <<'PHP'
<?php
/*
 * Plugin Name: Hide setup details
 * Description: Written by infra/wordpress/harden-wordpress.sh. Hides usernames and the WordPress version from visitors.
 */

// The REST user list (/wp-json/wp/v2/users) only for logged-in users; the editor needs it.
add_filter( 'rest_endpoints', function ( $endpoints ) {
	if ( ! is_user_logged_in() ) {
		foreach ( array_keys( $endpoints ) as $route ) {
			if ( str_starts_with( $route, '/wp/v2/users' ) ) {
				unset( $endpoints[ $route ] );
			}
		}
	}
	return $endpoints;
} );

// ?author=1 redirects to /author/<name>/, so both become a plain 404.
add_action( 'template_redirect', function () {
	if ( ! is_user_logged_in() && ( isset( $_GET['author'] ) || is_author() ) ) {
		global $wp_query;
		$wp_query->set_404();
		status_header( 404 );
		nocache_headers();
	}
}, 1 );
add_filter( 'redirect_canonical', function ( $redirect ) {
	return isset( $_GET['author'] ) ? false : $redirect;
} );

// No users sitemap (/wp-sitemap-users-1.xml) and no author in oEmbed responses.
add_filter( 'wp_sitemaps_add_provider', function ( $provider, $name ) {
	return 'users' === $name ? false : $provider;
}, 10, 2 );
add_filter( 'oembed_response_data', function ( $data ) {
	unset( $data['author_name'], $data['author_url'] );
	return $data;
} );

// No XML-RPC: it lets one request try hundreds of passwords.
add_filter( 'xmlrpc_enabled', '__return_false' );
add_filter( 'wp_headers', function ( $headers ) {
	unset( $headers['X-Pingback'] );
	return $headers;
} );

// No WordPress version in the page head, feeds or file links.
remove_action( 'wp_head', 'wp_generator' );
add_filter( 'the_generator', '__return_empty_string' );
$strip_version = function ( $src ) {
	return str_contains( (string) $src, 'ver=' . get_bloginfo( 'version' ) ) ? remove_query_arg( 'ver', $src ) : $src;
};
add_filter( 'style_loader_src', $strip_version );
add_filter( 'script_loader_src', $strip_version );
PHP
chown www-data:www-data "$WP_DIR/wp-content/mu-plugins/hide-setup.php"
chmod 644 "$WP_DIR/wp-content/mu-plugins/hide-setup.php"

step "Giving users a public name that is not their login"
# Bylines, feeds and author links use the display name and the "nicename" slug,
# which default to the login name. Change them only while they still match it.
# Before the browser install there are no users yet, so this waits for a re-run.
if wp core is-installed 2>/dev/null; then
	while IFS=, read -r id login nicename display; do
		if [[ "$nicename" == "$login" || "$display" == "$login" ]]; then
			name="${PUBLIC_NAME:-Author $id}"
			wp user update "$id" --user_nicename="author-$id" --display_name="$name" --nickname="$name" --quiet
			echo "user $id: public name is now '$name' (log in with your usual username)"
		fi
	done < <(wp user list --fields=ID,user_login,user_nicename,display_name --format=csv | tail -n +2)
else
	echo "WordPress is not set up in the browser yet; run this script again afterwards."
fi

step "Blocking XML-RPC and files that reveal the version in Apache"
cat > /etc/apache2/conf-available/wordpress-hardening.conf <<'EOF'
# Written by infra/wordpress/harden-wordpress.sh
<FilesMatch "^(xmlrpc\.php|readme\.html|license\.txt|wp-config-sample\.php)$">
	Require all denied
</FilesMatch>
EOF
a2enconf -q wordpress-hardening
apache2ctl configtest
systemctl reload apache2

step "Banning repeated failed log-ins with fail2ban"
cat > /etc/fail2ban/filter.d/wordpress-login.conf <<'EOF'
# Written by infra/wordpress/harden-wordpress.sh
# A failed log-in returns the form again (200); a good one redirects (302).
[Definition]
failregex = ^<HOST> \S+ \S+ [^"]*"POST /wp-login\.php[^"]*" 200
ignoreregex =
EOF
cat > /etc/fail2ban/jail.d/wordpress.conf <<'EOF'
# Written by infra/wordpress/harden-wordpress.sh
[wordpress-login]
enabled  = true
port     = http,https
filter   = wordpress-login
# Ubuntu defaults fail2ban to the systemd journal; Apache logs to a file.
backend  = polling
logpath  = /var/log/apache2/wordpress-access.log
maxretry = 5
findtime = 10m
bantime  = 1h
EOF
systemctl restart fail2ban
sleep 2
fail2ban-client status wordpress-login

step "Done"
echo "Check from your own machine that /wp-json/wp/v2/users, /?author=1 and /xmlrpc.php now give 401, 403 or 404."
