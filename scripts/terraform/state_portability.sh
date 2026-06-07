#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
TF_DIR="${ROOT_DIR}/terraform"
BACKUP_FILE="${ROOT_DIR}/terraform/state.backup.json"

usage() {
  cat <<'EOF'
Usage:
  scripts/terraform/state_portability.sh export [backup_file]
  scripts/terraform/state_portability.sh import <backup_file>
  scripts/terraform/state_portability.sh list

Examples:
  scripts/terraform/state_portability.sh export
  scripts/terraform/state_portability.sh export ./terraform/state.20260607.json
  scripts/terraform/state_portability.sh import ./terraform/state.backup.json
  scripts/terraform/state_portability.sh list
EOF
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

ACTION="$1"
shift || true

case "$ACTION" in
  export)
    DEST="${1:-$BACKUP_FILE}"
    terraform -chdir="$TF_DIR" state pull > "$DEST"
    echo "exported terraform state to: $DEST"
    ;;
  import)
    if [[ $# -lt 1 ]]; then
      echo "missing backup_file for import" >&2
      usage
      exit 1
    fi
    SRC="$1"
    terraform -chdir="$TF_DIR" state push -force "$SRC"
    echo "imported terraform state from: $SRC"
    ;;
  list)
    terraform -chdir="$TF_DIR" state list
    ;;
  *)
    echo "unknown action: $ACTION" >&2
    usage
    exit 1
    ;;
esac
