#!/usr/bin/env sh
# Wrapper at repo root — runs infra/scripts/automate-deploy-setup.sh
# Usage (from clone root): ./automate-deploy-setup.sh
# Do not use a leading slash (/infra/...) — that is not this repository.

set -eu
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
exec sh "${ROOT}/infra/scripts/automate-deploy-setup.sh" "$@"
