#!/usr/bin/env bash
#
# Build the site and deploy it from this machine.
# Use this while SSH on the server is limited to your own IP address,
# which GitHub Actions cannot connect from.
#
#   DEPLOY_HOST=<server ip> ./infra/deploy.sh
#
# Optional:
#   DEPLOY_KEY   private key for the deploy user (default ~/.ssh/rukysite_deploy)
#   SITE_URL     if set, checks the live site serves this build afterwards

set -euo pipefail

: "${DEPLOY_HOST:?Set DEPLOY_HOST to the server IP, e.g. DEPLOY_HOST=203.0.113.10 ./infra/deploy.sh}"
DEPLOY_KEY="${DEPLOY_KEY:-$HOME/.ssh/rukysite_deploy}"
APP_DIR=/var/www/rukysite
KEEP_RELEASES=5

cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [[ -n "$(git status --porcelain)" ]]; then
	echo "Warning: there are uncommitted changes; the deployed site will include them." >&2
fi

npm run build
commit="$(git rev-parse HEAD)"
echo "$commit" > out/version.txt

release="$(date -u +%Y%m%d%H%M%S)-${commit::7}"
ssh_cmd=(ssh -i "$DEPLOY_KEY" -o IdentitiesOnly=yes)

echo "==> Uploading release $release"
rsync -az --delete -e "${ssh_cmd[*]}" out/ "deploy@$DEPLOY_HOST:$APP_DIR/releases/$release/"

echo "==> Switching the live site to it"
# mv -T replaces the symlink in one step, so visitors never see a half-copied site.
"${ssh_cmd[@]}" "deploy@$DEPLOY_HOST" "set -e
	cd '$APP_DIR'
	ln -s 'releases/$release' current.new
	mv -T current.new current
	ls -1d releases/*/ | head -n -$KEEP_RELEASES | xargs -r rm -rf --"

if [[ -n "${SITE_URL:-}" ]]; then
	live="$(curl -fsS --max-time 10 "$SITE_URL/version.txt?c=$commit" || true)"
	if [[ "$live" == "$commit" ]]; then
		echo "==> Live site is serving $commit"
	else
		echo "Live site serves '$live', expected $commit" >&2
		exit 1
	fi
fi
echo "Done: $release"
