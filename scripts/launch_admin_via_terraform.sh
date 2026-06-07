#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TF_DIR="$ROOT_DIR/terraform"

if [[ ! -f "$TF_DIR/terraform.tfvars" ]]; then
  echo "terraform/terraform.tfvars not found. Copy from terraform/terraform.tfvars.example first." >&2
  exit 1
fi

terraform -chdir="$TF_DIR" init
terraform -chdir="$TF_DIR" apply -auto-approve
echo "Launched admin via terraform provider."
terraform -chdir="$TF_DIR" output app_url
