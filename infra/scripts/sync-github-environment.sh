#!/usr/bin/env sh
# Creates/updates GitHub Environment "production" variables for OIDC deploy.
# Requires: gh CLI authenticated (gh auth login), aws CLI for account id.
# Run from repo root after provision-github-oidc-role.sh

set -eu

ROLE_NAME="${GITHUB_OIDC_ROLE_NAME:-github-signeddata-org-home}"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not found. Install https://cli.github.com and run: gh auth login" >&2
  exit 1
fi

REPO_SLUG="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)"
if [ -z "${REPO_SLUG}" ]; then
  echo "Not inside a gh repo context. Run from a clone of signed-data/signed-data or set GH_REPO." >&2
  exit 1
fi

echo "==> Ensuring environment 'production' on ${REPO_SLUG}"
gh api --method PUT \
  -H "Accept: application/vnd.github+json" \
  "/repos/${REPO_SLUG}/environments/production" \
  >/dev/null

echo "==> Setting AWS_ACCOUNT_ID=${ACCOUNT_ID}"
gh variable set AWS_ACCOUNT_ID --env production --body "${ACCOUNT_ID}"

echo "==> Setting AWS_DEPLOY_ROLE_ARN=${ROLE_ARN}"
gh variable set AWS_DEPLOY_ROLE_ARN --env production --body "${ROLE_ARN}"

echo ""
echo "Done. Push to main or run 'Deploy site' workflow."
