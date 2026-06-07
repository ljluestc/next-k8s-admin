#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TF_DIR="$ROOT_DIR/terraform"
STAMP="$(date +%Y%m%d-%H%M%S)"
DEFAULT_OUTPUT="$TF_DIR/state-backups/terraform-state-${STAMP}.tfstate"
OUTPUT_PATH="${1:-$DEFAULT_OUTPUT}"

mkdir -p "$(dirname "$OUTPUT_PATH")"

terraform -chdir="$TF_DIR" init -input=false >/dev/null
terraform -chdir="$TF_DIR" state pull > "$OUTPUT_PATH"

echo "Exported Terraform state to: $OUTPUT_PATH"
