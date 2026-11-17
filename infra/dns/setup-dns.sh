#!/usr/bin/env bash
#
# Turn this server into an authoritative DNS server for one zone, using BIND 9.
# Safe to run again; it rewrites its own configuration files each time.
#
#   sudo ./setup-dns.sh <zone> <public ip>
#
#   zone       the zone this server answers for, e.g. lab.manuelruky.dev
#   public ip  this server's public IPv4 address
#
# "Authoritative" means it holds the real records for its zone and answers
# questions about them. It does not look up other people's domains (that is a
# "recursive" resolver, and leaving one open to the internet invites abuse).
#
# Before the outside world can use it you also need:
#   - Oracle security list: ingress UDP 53 and TCP 53 from 0.0.0.0/0
#   - at the registrar, in the parent domain's DNS:
#       NS  <zone>      ->  ns1.<zone>
#       A   ns1.<zone>  ->  <public ip>      (the "glue" record)

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
	echo "Run this with sudo." >&2
	exit 1
fi
if [[ $# -ne 2 ]]; then
	echo "Usage: sudo $0 <zone> <public ip>" >&2
	exit 1
fi

ZONE="${1%.}"
PUBLIC_IP="$2"

if [[ ! "$ZONE" =~ ^([a-z0-9-]+\.)+[a-z]{2,}$ ]]; then
	echo "The zone must look like lab.example.dev (lower case)." >&2
	exit 1
fi
if [[ ! "$PUBLIC_IP" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
	echo "The second argument must be an IPv4 address." >&2
	exit 1
fi

# The address the network card actually has. On Oracle Cloud this is the
# private address; the public one is mapped onto it outside the server.
LISTEN_IP="$(ip -4 route get 1.1.1.1 | awk '{for (i = 1; i < NF; i++) if ($i == "src") print $(i + 1)}')"
ZONE_FILE="/etc/bind/zones/db.$ZONE"
SERIAL="$(date -u +%Y%m%d%H)"

step() { printf '\n==> %s\n' "$1"; }
export DEBIAN_FRONTEND=noninteractive

step "Installing BIND"
apt-get update
apt-get -y install bind9 bind9-utils bind9-dnsutils

step "Writing the server options"
cat > /etc/bind/named.conf.options <<CONF
options {
	directory "/var/cache/bind";

	// Answer on the network card only. systemd-resolved keeps 127.0.0.53.
	listen-on { $LISTEN_IP; };
	listen-on-v6 { none; };

	// Authoritative only: never look up other domains for strangers.
	recursion no;
	allow-query { any; };

	// Nobody may download the whole zone.
	allow-transfer { none; };

	// Do not advertise the software version.
	version "not disclosed";

	// Limit identical answers per second, so the server cannot be used
	// to flood a victim with responses.
	rate-limit {
		responses-per-second 10;
	};
};
CONF

step "Declaring the zone $ZONE"
cat > /etc/bind/named.conf.local <<CONF
zone "$ZONE" {
	type primary;
	file "$ZONE_FILE";
};
CONF

step "Writing the zone's records"
install -d -m 755 /etc/bind/zones
cat > "$ZONE_FILE" <<ZONEFILE
; Records for $ZONE
; After any edit, raise the serial number and run: sudo rndc reload
\$TTL 300
@       IN  SOA  ns1.$ZONE. hostmaster.$ZONE. (
            $SERIAL  ; serial: raise it on every change
            3600        ; refresh
            900         ; retry
            1209600     ; expire
            300 )       ; how long "no such name" answers are cached

; The name server for this zone, and its address
@       IN  NS   ns1.$ZONE.
ns1     IN  A    $PUBLIC_IP

; Records served by this server
@       IN  A    $PUBLIC_IP
www     IN  A    $PUBLIC_IP
hello   IN  TXT  "Answered by my own DNS server"
ZONEFILE

step "Checking the configuration"
named-checkconf
named-checkzone "$ZONE" "$ZONE_FILE"

step "Opening port 53 in the instance firewall"
# Same approach as setup.sh: new rules go above Oracle's REJECT rule.
open_port() {
	local proto="$1"
	if iptables -C INPUT -p "$proto" --dport 53 -j ACCEPT 2>/dev/null; then
		return
	fi
	local reject_line
	reject_line="$(iptables -L INPUT --line-numbers -n | awk '$2 == "REJECT" {print $1; exit}')"
	if [[ -n "$reject_line" ]]; then
		iptables -I INPUT "$reject_line" -p "$proto" --dport 53 -j ACCEPT
	else
		iptables -A INPUT -p "$proto" --dport 53 -j ACCEPT
	fi
}
open_port udp
open_port tcp
netfilter-persistent save

step "Starting BIND"
systemctl enable named
systemctl restart named
sleep 2
if ! systemctl is-active --quiet named; then
	echo "BIND failed to start. Its last log lines:" >&2
	journalctl -u named -n 15 --no-pager >&2
	exit 1
fi

step "Asking the server a question"
answer="$(dig +short @"$LISTEN_IP" "$ZONE" A)"
if [[ "$answer" != "$PUBLIC_IP" ]]; then
	echo "Expected $PUBLIC_IP for $ZONE but got '$answer'." >&2
	exit 1
fi
dig @"$LISTEN_IP" "$ZONE" A +norecurse | grep -E "flags:|^$ZONE"

step "Done"
cat <<DONE
BIND is answering for $ZONE on this server.

Test it from your own machine (needs Oracle's security list to allow port 53):
  dig @$PUBLIC_IP $ZONE A
  dig @$PUBLIC_IP hello.$ZONE TXT

Once the NS and glue records exist at the registrar, test the whole chain:
  dig $ZONE A
  dig +trace $ZONE A
DONE
