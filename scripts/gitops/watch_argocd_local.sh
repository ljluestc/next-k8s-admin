#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BOOTSTRAP_SCRIPT="${SCRIPT_DIR}/bootstrap_argocd.sh"
WATCH_INTERVAL_SECONDS="${WATCH_INTERVAL_SECONDS:-5}"

hash_manifests() {
  find "${ROOT_DIR}/deploy/argocd" "${ROOT_DIR}/deploy/apps" \
    -type f \( -name '*.yaml' -o -name '*.yml' \) \
    -print0 \
    | sort -z \
    | xargs -0 sha256sum \
    | sha256sum \
    | awk '{print $1}'
}

last_hash=""

echo "[gitops-watch] watching deploy manifests every ${WATCH_INTERVAL_SECONDS}s"
while true; do
  current_hash="$(hash_manifests)"
  if [[ "${current_hash}" != "${last_hash}" ]]; then
    echo "[gitops-watch] change detected at $(date -Iseconds)"
    "${BOOTSTRAP_SCRIPT}"
    last_hash="${current_hash}"
  fi
  sleep "${WATCH_INTERVAL_SECONDS}"
done
