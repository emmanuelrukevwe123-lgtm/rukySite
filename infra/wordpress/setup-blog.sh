#!/usr/bin/env bash
#
# Turn a fresh WordPress (from setup-wordpress.sh) into a DevOps lab-notes blog,
# entirely from the command line with WP-CLI. Safe to run again: it never
# overwrites a page or post that already exists, so your edits are kept.
#
#   sudo bash setup-blog.sh
#
# What it does:
#   1. installs and activates the "Lab Notes" child theme (next to this script)
#      and downloads its fonts
#   2. sets the title, tagline, time zone, date format and clean post links
#   3. creates the categories for each series of notes
#   4. creates the About and Start here pages and removes the sample page
#   5. creates one DRAFT post per server built so far, each with an outline to
#      fill in (drafts are not visible to visitors until you publish them)

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
	echo "Run this with sudo." >&2
	exit 1
fi

WP_DIR=/var/www/wordpress
HERE="$(cd "$(dirname "$0")" && pwd)"
THEME_SRC="$HERE/lab-notes-theme"
THEME_DIR="$WP_DIR/wp-content/themes/lab-notes"

SITE_TITLE="Manuel Ruky · Lab Notes"
TAGLINE="Learning DevOps by building real servers on Oracle Cloud"
TIMEZONE="Africa/Lagos"

wp() { sudo -u www-data /usr/local/bin/wp --path="$WP_DIR" --quiet "$@"; }
wpv() { sudo -u www-data /usr/local/bin/wp --path="$WP_DIR" "$@"; }
step() { printf '\n==> %s\n' "$1"; }

if [[ ! -f "$THEME_SRC/theme.json" ]]; then
	echo "Cannot find $THEME_SRC; copy the whole infra folder to the server first." >&2
	exit 1
fi
# Work from the WordPress folder. WP-CLI runs as www-data, and some commands
# start a second copy of PHP; that fails with "posix_spawn() failed: Permission
# denied" if the current folder is one www-data may not enter, such as
# /home/ubuntu (private on Ubuntu 24.04).
cd "$WP_DIR"
wpv core is-installed || { echo "Finish the WordPress install in the browser first." >&2; exit 1; }

step "Installing the Lab Notes theme"
install -d "$THEME_DIR/assets/fonts"
cp -r "$THEME_SRC/." "$THEME_DIR/"
fonts="https://cdn.jsdelivr.net/fontsource/fonts"
fetch() { [[ -s "$THEME_DIR/assets/fonts/$1" ]] || curl -fsSL -o "$THEME_DIR/assets/fonts/$1" "$2"; }
fetch lora.woff2           "$fonts/lora:vf@latest/latin-wght-normal.woff2"
fetch lora-italic.woff2    "$fonts/lora:vf@latest/latin-wght-italic.woff2"
fetch hanken-grotesk.woff2 "$fonts/hanken-grotesk:vf@latest/latin-wght-normal.woff2"
fetch jetbrains-mono.woff2 "$fonts/jetbrains-mono:vf@latest/latin-wght-normal.woff2"
chown -R www-data:www-data "$THEME_DIR"
find "$THEME_DIR" -type d -exec chmod 755 {} +
find "$THEME_DIR" -type f -exec chmod 644 {} +
wp theme activate lab-notes

step "Site settings"
wp option update blogname "$SITE_TITLE"
wp option update blogdescription "$TAGLINE"
wp option update timezone_string "$TIMEZONE"
wp option update date_format "j F Y"
# Comments off by default: without a spam filter they fill up with spam.
wp option update default_comment_status closed

step "Clean post links (/post-name/ instead of /?p=123)"
htaccess="$WP_DIR/.htaccess"
if ! grep -q "BEGIN WordPress" "$htaccess" 2>/dev/null; then
	cat >> "$htaccess" <<'EOF'
# BEGIN WordPress
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]
RewriteBase /
RewriteRule ^index\.php$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.php [L]
</IfModule>
# END WordPress
EOF
	chown www-data:www-data "$htaccess"
	chmod 644 "$htaccess"
fi
wp rewrite structure '/%postname%/'
wp rewrite flush

step "Categories"
ensure_cat() { # slug, name, description
	if ! wpv term get category "$1" --by=slug --field=term_id &>/dev/null; then
		wp term create category "$2" --slug="$1" --description="$3"
	fi
	echo "  $2"
}
# The default "Uncategorized" becomes a general "Notes" category.
wp term update category 1 --name="Notes" --slug="notes"
ensure_cat cloud-linux "Cloud & Linux" "Virtual machines, SSH, users and firewalls."
ensure_cat web-servers "Web servers" "Serving websites: Caddy, Apache, HTTPS."
ensure_cat dns "DNS" "Domain names, zones and running my own name server."
ensure_cat mail "Mail" "Receiving, reading and sending email from my own server."
ensure_cat wordpress "WordPress" "Installing and running WordPress myself."
ensure_cat security "Security" "Hardening, certificates and keeping things patched."

# --- helpers for block content -------------------------------------------
h2() { printf '<!-- wp:heading -->\n<h2 class="wp-block-heading">%s</h2>\n<!-- /wp:heading -->\n\n' "$1"; }
p() { printf '<!-- wp:paragraph -->\n<p>%s</p>\n<!-- /wp:paragraph -->\n\n' "$1"; }
hint() { p "<em>[$1]</em>"; }
code() { printf '<!-- wp:code -->\n<pre class="wp-block-code"><code>%s</code></pre>\n<!-- /wp:code -->\n\n' "$1"; }
list() {
	printf '<!-- wp:list -->\n<ul class="wp-block-list">'
	for item in "$@"; do printf '<!-- wp:list-item -->\n<li>%s</li>\n<!-- /wp:list-item -->' "$item"; done
	printf '</ul>\n<!-- /wp:list -->\n\n'
}
# The outline every lab note follows.
outline() { # intro hint, commands
	hint "$1"
	h2 "What I built"
	hint "One or two sentences. What does it do, and where can someone see it?"
	h2 "Why it matters"
	hint "What problem does this solve? Why would a client want it?"
	h2 "The steps"
	hint "The main steps in order, with a sentence on what each one does."
	h2 "What went wrong"
	hint "Errors you hit and how you fixed them. This is the most useful part for readers."
	h2 "What I learned"
	hint "Two or three things you know now that you did not before."
	h2 "Commands I will reuse"
	code "$2"
}

ensure_post() { # type, slug, title, status, categories, content
	local id
	id="$(wpv post list --post_type="$1" --name="$2" --post_status=any --field=ID)"
	if [[ -z "$id" ]]; then
		wp post create --post_type="$1" --post_name="$2" --post_title="$3" --post_status="$4" \
			${5:+--post_category="$5"} --post_content="$6"
		echo "  created: $3 ($4)"
	else
		echo "  kept:    $3 (already exists)"
	fi
}

step "Pages"
sample="$(wpv post list --post_type=page --name=sample-page --post_status=any --field=ID)"
[[ -n "$sample" ]] && wp post delete "$sample" --force

ensure_post page about "About" publish "" "$(
	p "I am Emmanuel (Manuel Ruky). I am learning DevOps by building real servers, not just reading about them."
	p "Everything on this blog runs on Oracle Cloud's free tier: a web server for my portfolio, my own DNS and mail servers, and this WordPress site on a second virtual machine. Each note covers one thing I built, the mistakes I made, and the commands I would use to do it again for someone else."
	hint "Rewrite this in your own words, and add a photo with the Image block."
	p "My portfolio: <a href=\"https://manuelruky.dev\">manuelruky.dev</a>"
)"

ensure_post page start-here "Start here" publish "" "$(
	p "New here? The notes build on each other. Read them in this order:"
	list \
		"<a href=\"/category/cloud-linux/\">Cloud &amp; Linux</a>: getting a free server and locking it down" \
		"<a href=\"/category/web-servers/\">Web servers</a>: putting a website online over HTTPS" \
		"<a href=\"/category/dns/\">DNS</a>: running my own name server" \
		"<a href=\"/category/mail/\">Mail</a>: receiving email on my own domain" \
		"<a href=\"/category/wordpress/\">WordPress</a>: installing and managing it over SSH"
)"

step "Draft notes (fill these in, then publish)"
ensure_post post oracle-free-server "Getting a free server on Oracle Cloud and locking it down" draft "cloud-linux,security" "$(
	outline "Launching an Always Free VM, SSH keys, the security list, iptables above Oracle's REJECT rule, fail2ban." \
"ssh -i ~/.ssh/oracle_site ubuntu@SERVER_IP
sudo iptables -L INPUT -n --line-numbers
sudo netfilter-persistent save
sudo fail2ban-client status sshd")"

ensure_post post caddy-https "Putting my portfolio online with Caddy and HTTPS" draft "web-servers,security" "$(
	outline "Caddy, automatic Let's Encrypt certificates, security headers, deploying with a symlink switch." \
"caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
curl -I https://manuelruky.dev
sudo journalctl -u caddy -f")"

ensure_post post bind-dns "Running my own DNS server with BIND" draft "dns" "$(
	outline "Delegating lab.manuelruky.dev from Name.com, glue records, zone files, serial numbers, and why my home router lied to dig." \
"sudo named-checkzone lab.manuelruky.dev /etc/bind/zones/db.lab.manuelruky.dev
sudo rndc reload
dig TXT hello.lab.manuelruky.dev @8.8.8.8
dig +trace lab.manuelruky.dev")"

ensure_post post postfix-dovecot "Receiving email on my own domain with Postfix and Dovecot" draft "mail" "$(
	outline "MX, SPF and DMARC records, Postfix on 25 and 587, Dovecot on 993, and why Oracle blocks sending on port 25." \
"dig MX lab.manuelruky.dev @8.8.8.8
sudo tail -f /var/log/mail.log
postconf -n
doveconf -n")"

ensure_post post wordpress-oracle "Installing WordPress on a second VM and managing it over SSH" draft "wordpress" "$(
	outline "A LAMP stack (Apache, MariaDB, PHP), Let's Encrypt with Certbot, and WP-CLI." \
"sudo -u www-data wp --path=/var/www/wordpress core version
sudo -u www-data wp --path=/var/www/wordpress plugin list
sudo -u www-data wp --path=/var/www/wordpress db export backup.sql
curl -sI http://wp.manuelruky.dev | head -n 5")"

step "Done"
cat <<DONE
The blog is set up with the Lab Notes theme. Open https://wp.manuelruky.dev to see it.

Your five notes are DRAFTS. In the dashboard: Posts -> open a draft, replace
the [bracketed hints] with your own words, then Publish.

Check from here:
  sudo -u www-data wp --path=$WP_DIR post list --post_status=draft
  sudo -u www-data wp --path=$WP_DIR term list category --fields=name,slug,count
DONE
