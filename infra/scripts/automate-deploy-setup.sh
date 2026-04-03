#!/usr/bin/env sh
# One-shot: provision AWS OIDC + IAM role, then sync GitHub production variables.
# Usage: ./infra/scripts/automate-deploy-setup.sh
# Env: DRY_RUN=1 to print actions only for AWS steps; GITHUB_REPOSITORY, GITHUB_OIDC_ROLE_NAME optional.

set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "${SCRIPT_DIR}/../.." && pwd)"

echo "==> Step 1/2: AWS IAM (OIDC provider + deploy role)"
sh "${SCRIPT_DIR}/provision-github-oidc-role.sh"

if [ "${SKIP_GH_SYNC:-}" = "1" ]; then
  echo "SKIP_GH_SYNC=1 set; skipping GitHub variable sync."
  exit 0
fi

echo ""
echo "==> Step 2/2: GitHub environment variables"
(cd "${REPO_ROOT}" && sh "${SCRIPT_DIR}/sync-github-environment.sh")
