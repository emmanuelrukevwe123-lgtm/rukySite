#!/usr/bin/env bash
#
# Send outgoing mail through a relay (smarthost) on port 587.
# Oracle Cloud blocks outgoing port 25, so Postfix cannot deliver to Gmail and
# others directly; it hands outgoing mail to a relay service, which delivers it.
# Mail for this server's own domain is still delivered locally, as before.
# Safe to run again (for example to change the key).
#
#   sudo ./setup-relay.sh <relay host> <relay login>
#
#   relay host   e.g. smtp-relay.brevo.com
#   relay login  the SMTP login the relay gives you (not your account email,
#                unless the relay says so)
#
# The SMTP key/password is asked for at the prompt, so it never appears in
# your shell history or in the process list.

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
	echo "Run this with sudo." >&2
	exit 1
fi
if [[ $# -ne 2 ]]; then
	echo "Usage: sudo $0 <relay host> <relay login>" >&2
	exit 1
fi

RELAY_HOST="$1"
RELAY_LOGIN="$2"
PORT=587

read -r -s -p "SMTP key for $RELAY_LOGIN: " RELAY_KEY
echo
if [[ -z "$RELAY_KEY" ]]; then
	echo "No key entered." >&2
	exit 1
fi

step() { printf '\n==> %s\n' "$1"; }

step "Installing the SASL client modules Postfix needs to log in to the relay"
DEBIAN_FRONTEND=noninteractive apt-get -y install libsasl2-modules

step "Storing the relay login (readable by root only)"
umask 077
printf '[%s]:%s %s:%s\n' "$RELAY_HOST" "$PORT" "$RELAY_LOGIN" "$RELAY_KEY" > /etc/postfix/sasl_passwd
postmap /etc/postfix/sasl_passwd
chmod 600 /etc/postfix/sasl_passwd /etc/postfix/sasl_passwd.db

step "Pointing Postfix at the relay"
postconf -e \
	"relayhost = [$RELAY_HOST]:$PORT" \
	"smtp_sasl_auth_enable = yes" \
	"smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd" \
	"smtp_sasl_security_options = noanonymous" \
	"smtp_sasl_tls_security_options = noanonymous" \
	"smtp_tls_security_level = encrypt"
postfix check
systemctl reload postfix

step "Done"
cat <<DONE
Outgoing mail now goes through [$RELAY_HOST]:$PORT (always encrypted).

Test: send an email from your mail app to a Gmail address, then run
  sudo tail -n 20 /var/log/mail.log
and look for: relay=$RELAY_HOST ... status=sent

Mail still stuck from before can be retried with: sudo postqueue -f
DONE
