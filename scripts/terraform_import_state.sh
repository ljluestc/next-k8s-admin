#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TF_DIR="$ROOT_DIR/terraform"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <state-file-path> [--yes]" >&2
  exit 1
fi

STATE_FILE="$1"
AUTO_YES="${2:-}"

if [[ ! -f "$STATE_FILE" ]]; then
  echo "State file not found: $STATE_FILE" >&2
  exit 1
fi

if [[ "$AUTO_YES" != "--yes" ]]; then
  read -r -p "Import state from '$STATE_FILE' and overwrite current Terraform state? [y/N] " ANSWER
  case "$ANSWER" in
    y|Y|yes|YES) ;;
    *)
      echo "Cancelled."
      exit 1
      ;;
  esac
fi

mkdir -p "$TF_DIR/state-backups"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_PATH="$TF_DIR/state-backups/pre-import-${STAMP}.tfstate"

terraform -chdir="$TF_DIR" init -input=false >/dev/null
terraform -chdir="$TF_DIR" state pull > "$BACKUP_PATH"
terraform -chdir="$TF_DIR" state push -force "$STATE_FILE"

echo "Imported Terraform state from: $STATE_FILE"
echo "Previous state backup saved to: $BACKUP_PATH"
