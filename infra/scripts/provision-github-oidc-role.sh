#!/usr/bin/env sh
# Idempotent: ensure GitHub OIDC provider + IAM role for signed-data/signed-data deploys.
# Requires: aws CLI, credentials with IAM admin (or sufficient) access.
# Optional env: GITHUB_REPOSITORY (default signed-data/signed-data), GITHUB_OIDC_ROLE_NAME,
# GITHUB_OIDC_THUMBPRINT, DRY_RUN=1

set -eu

REPO="${GITHUB_REPOSITORY:-signed-data/signed-data}"
ROLE_NAME="${GITHUB_OIDC_ROLE_NAME:-github-signeddata-org-home}"
THUMBPRINT="${GITHUB_OIDC_THUMBPRINT:-6938fd4d98bab03faadb97b34396831e3780aea1}"
OIDC_URL="https://token.actions.githubusercontent.com"

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
OIDC_ARN="arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"

echo "==> Account: ${ACCOUNT_ID}"
echo "==> Repository subject: repo:${REPO}:*"
echo "==> Role: ${ROLE_NAME}"

have_oidc_provider() {
  aws iam list-open-id-connect-providers --output text 2>/dev/null | grep -Fq "token.actions.githubusercontent.com"
}

if ! have_oidc_provider; then
  echo "==> Creating OIDC provider ${OIDC_URL}"
  if [ "${DRY_RUN:-}" = "1" ]; then
    echo "(dry-run) aws iam create-open-id-connect-provider ..."
  else
    aws iam create-open-id-connect-provider \
      --url "${OIDC_URL}" \
      --client-id-list sts.amazonaws.com \
      --thumbprint-list "${THUMBPRINT}" \
      >/dev/null
  fi
else
  echo "==> OIDC provider already exists"
fi

TRUST_FILE="$(mktemp)"
trap 'rm -f "${TRUST_FILE}"' EXIT INT TERM

cat >"${TRUST_FILE}" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:${REPO}:*"
        }
      }
    }
  ]
}
EOF

if aws iam get-role --role-name "${ROLE_NAME}" >/dev/null 2>&1; then
  echo "==> Updating assume-role policy on ${ROLE_NAME}"
  if [ "${DRY_RUN:-}" = "1" ]; then
    echo "(dry-run) aws iam update-assume-role-policy ..."
  else
    aws iam update-assume-role-policy \
      --role-name "${ROLE_NAME}" \
      --policy-document "file://${TRUST_FILE}"
  fi
else
  echo "==> Creating role ${ROLE_NAME}"
  if [ "${DRY_RUN:-}" = "1" ]; then
    echo "(dry-run) aws iam create-role ..."
  else
    aws iam create-role \
      --role-name "${ROLE_NAME}" \
      --description "GitHub Actions OIDC deploy for ${REPO}" \
      --assume-role-policy-document "file://${TRUST_FILE}" \
      >/dev/null
  fi
fi

ADMIN_ARN="arn:aws:iam::aws:policy/AdministratorAccess"
if aws iam list-attached-role-policies --role-name "${ROLE_NAME}" --output text 2>/dev/null | grep -Fq "AdministratorAccess"; then
  echo "==> AdministratorAccess already attached"
else
  echo "==> Attaching AdministratorAccess (tighten later for least privilege)"
  if [ "${DRY_RUN:-}" = "1" ]; then
    echo "(dry-run) aws iam attach-role-policy ..."
  else
    aws iam attach-role-policy --role-name "${ROLE_NAME}" --policy-arn "${ADMIN_ARN}"
  fi
fi

echo ""
echo "Deploy role ARN (use in GitHub or run sync-github-environment.sh):"
echo "  ${ROLE_ARN}"
echo ""
