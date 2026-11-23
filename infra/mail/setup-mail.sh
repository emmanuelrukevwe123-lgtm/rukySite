#!/usr/bin/env bash
#
# Turn this server into a mail server that RECEIVES mail for one domain and lets
# you READ it from a phone or mail app. Uses Postfix (SMTP) and Dovecot (IMAP).
# Safe to run again.
#
#   sudo ./setup-mail.sh <mail domain> <mailbox user>
#
#   mail domain   the part after the @, e.g. lab.manuelruky.dev
#   mailbox user  the name before the @, e.g. emmanuel (a login is created for it)
#
# Before running it you need, in the domain's DNS:
#   mail.<domain>   A    <this server's public ip>
#   <domain>        MX   10 mail.<domain>.
# and ports 25, 587 and 993 open in the Oracle security list.
#
# What it does:
#   1. asks Caddy for a TLS certificate for mail.<domain> and copies it for mail use
#   2. installs Postfix: receives mail on port 25, accepts mail from your apps on 587
#   3. installs Dovecot: serves your mailbox over encrypted IMAP on port 993
#   4. opens 25, 587 and 993 in the instance firewall
#   5. creates the mailbox user
#
# Sending mail OUT to other domains is not set up here: Oracle blocks outgoing
# port 25, so that needs a relay on port 587 (a separate step).

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
	echo "Run this with sudo." >&2
	exit 1
fi
if [[ $# -ne 2 ]]; then
	echo "Usage: sudo $0 <mail domain> <mailbox user>" >&2
	exit 1
fi

DOMAIN="${1%.}"
MAILBOX_USER="$2"
MAILHOST="mail.$DOMAIN"
CERT_DIR=/etc/ssl/mail

if [[ ! "$DOMAIN" =~ ^([a-z0-9-]+\.)+[a-z]{2,}$ ]]; then
	echo "The domain must look like lab.example.dev (lower case)." >&2
	exit 1
fi
if [[ ! "$MAILBOX_USER" =~ ^[a-z][a-z0-9_-]{1,30}$ ]]; then
	echo "The mailbox user must be lower case letters and digits, e.g. emmanuel." >&2
	exit 1
fi
if ! command -v caddy &>/dev/null; then
	echo "Caddy is not installed; run infra/server/setup.sh first (it provides the certificate)." >&2
	exit 1
fi

step() { printf '\n==> %s\n' "$1"; }
export DEBIAN_FRONTEND=noninteractive

step "Getting a TLS certificate for $MAILHOST from Caddy"
# Caddy already renews certificates for the website. A site block for the mail
# host name makes it look after this certificate too. (If setup.sh is ever run
# again it rewrites the Caddyfile; run this script again afterwards.)
if ! grep -q "^$MAILHOST {" /etc/caddy/Caddyfile; then
	cat >> /etc/caddy/Caddyfile <<EOF

# Only here so Caddy obtains and renews the certificate the mail server uses.
$MAILHOST {
	respond "Mail server for $DOMAIN" 200
}
EOF
	caddy validate --adapter caddyfile --config /etc/caddy/Caddyfile
	chown -R caddy:caddy /var/log/caddy
	systemctl reload caddy
fi
cert_src=""
for _ in $(seq 1 30); do
	cert_src="$(find /var/lib/caddy -type f -name "$MAILHOST.crt" 2>/dev/null | head -n 1)"
	[[ -n "$cert_src" ]] && break
	sleep 3
done
if [[ -z "$cert_src" ]]; then
	echo "Caddy has not obtained a certificate for $MAILHOST yet. Check that its A record" >&2
	echo "points here, then look at: journalctl -u caddy -n 30" >&2
	exit 1
fi
echo "Found $cert_src"

# Copy it where Postfix and Dovecot read it, and keep the copy fresh every week.
cat > /usr/local/bin/mail-cert-sync <<EOF
#!/bin/sh
# Copies Caddy's certificate for $MAILHOST to $CERT_DIR and reloads the mail services.
set -e
src="\$(find /var/lib/caddy -type f -name '$MAILHOST.crt' | head -n 1)"
install -d -m 755 $CERT_DIR
install -m 644 "\$src" $CERT_DIR/fullchain.pem
install -m 600 "\${src%.crt}.key" $CERT_DIR/privkey.pem
systemctl reload postfix dovecot 2>/dev/null || true
EOF
chmod 755 /usr/local/bin/mail-cert-sync
ln -sf /usr/local/bin/mail-cert-sync /etc/cron.weekly/mail-cert-sync
/usr/local/bin/mail-cert-sync

step "Installing Postfix and Dovecot"
debconf-set-selections <<EOF
postfix postfix/mailname string $DOMAIN
postfix postfix/main_mailer_type string Internet Site
EOF
apt-get update
apt-get -y install postfix dovecot-imapd

step "Configuring Postfix"
postconf -e \
	"myhostname = $MAILHOST" \
	"mydomain = $DOMAIN" \
	"myorigin = \$mydomain" \
	"mydestination = \$myhostname, \$mydomain, localhost" \
	"mynetworks = 127.0.0.0/8" \
	"inet_interfaces = all" \
	"inet_protocols = ipv4" \
	"home_mailbox = Maildir/" \
	"smtpd_banner = \$myhostname ESMTP" \
	"smtpd_helo_required = yes" \
	"disable_vrfy_command = yes" \
	"smtpd_tls_cert_file = $CERT_DIR/fullchain.pem" \
	"smtpd_tls_key_file = $CERT_DIR/privkey.pem" \
	"smtpd_tls_security_level = may" \
	"smtpd_tls_protocols = >=TLSv1.2" \
	"smtp_tls_security_level = may" \
	"smtpd_sasl_type = dovecot" \
	"smtpd_sasl_path = private/auth" \
	"smtpd_relay_restrictions = permit_mynetworks, permit_sasl_authenticated, reject_unauth_destination"
# Port 587, for your own mail apps: encryption and a login are compulsory.
postconf -M "submission/inet=submission inet n - y - - smtpd"
postconf -P \
	"submission/inet/syslog_name=postfix/submission" \
	"submission/inet/smtpd_tls_security_level=encrypt" \
	"submission/inet/smtpd_sasl_auth_enable=yes" \
	"submission/inet/smtpd_client_restrictions=permit_sasl_authenticated,reject"
postfix check

step "Configuring Dovecot"
# Ubuntu's dovecot.conf reads local.conf last, so these settings win.
cat > /etc/dovecot/local.conf <<EOF
# Written by infra/mail/setup-mail.sh
protocols = imap
mail_location = maildir:~/Maildir

# Encrypted connections only, with the same certificate as Postfix.
ssl = required
ssl_cert = <$CERT_DIR/fullchain.pem
ssl_key = <$CERT_DIR/privkey.pem
ssl_min_protocol = TLSv1.2
disable_plaintext_auth = yes
auth_mechanisms = plain login

# IMAP only on 993 (encrypted from the first byte); plain port 143 is off.
service imap-login {
  inet_listener imap {
    port = 0
  }
  inet_listener imaps {
    port = 993
    ssl = yes
  }
}

# Lets Postfix check passwords against Dovecot when you send on port 587.
service auth {
  unix_listener /var/spool/postfix/private/auth {
    mode = 0660
    user = postfix
    group = postfix
  }
}
EOF
doveconf -n > /dev/null

step "Opening ports 25, 587 and 993 in the instance firewall"
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
open_port 25
open_port 587
open_port 993
netfilter-persistent save

step "Creating the mailbox user $MAILBOX_USER"
if ! id "$MAILBOX_USER" &>/dev/null; then
	# No shell: this account can read mail but cannot log in to the server.
	adduser --gecos "Mailbox" --shell /usr/sbin/nologin "$MAILBOX_USER"
else
	echo "$MAILBOX_USER already exists; keeping its password."
fi

step "Starting the services"
systemctl enable postfix dovecot
systemctl restart postfix dovecot
sleep 2
for svc in postfix dovecot; do
	if ! systemctl is-active --quiet "$svc"; then
		echo "$svc failed to start. Its last log lines:" >&2
		journalctl -u "$svc" -n 20 --no-pager >&2
		exit 1
	fi
done
ss -tlnp | grep -E ':(25|587|993)\b' || true

step "Done"
cat <<DONE
Mail for $MAILBOX_USER@$DOMAIN is now delivered to /home/$MAILBOX_USER/Maildir.

Test receiving: send an email from Gmail to $MAILBOX_USER@$DOMAIN, then run
  sudo tail -n 20 /var/log/mail.log

Read it in a mail app with these settings:
  IMAP server  $MAILHOST   port 993   SSL/TLS
  Username     $MAILBOX_USER          (the password you just set)
DONE
