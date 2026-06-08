#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

KUBE_CONTEXT="${KUBE_CONTEXT:-kind-k8s-admin-local}"
ARGOCD_NAMESPACE="${ARGOCD_NAMESPACE:-argocd}"
ROOT_APP_MANIFEST="${ROOT_DIR}/deploy/argocd/root-application.yaml"
ARGOCD_APPS_DIR="${ROOT_DIR}/deploy/argocd/apps"

if [[ ! -f "${ROOT_APP_MANIFEST}" ]]; then
  echo "missing root app manifest: ${ROOT_APP_MANIFEST}" >&2
  exit 1
fi

if [[ ! -d "${ARGOCD_APPS_DIR}" ]]; then
  echo "missing apps directory: ${ARGOCD_APPS_DIR}" >&2
  exit 1
fi

echo "[gitops] applying root app: ${ROOT_APP_MANIFEST}"
kubectl --context "${KUBE_CONTEXT}" apply -f "${ROOT_APP_MANIFEST}"

echo "[gitops] applying application set: ${ARGOCD_APPS_DIR}"
kubectl --context "${KUBE_CONTEXT}" apply -f "${ARGOCD_APPS_DIR}"

echo "[gitops] current ArgoCD applications:"
kubectl --context "${KUBE_CONTEXT}" -n "${ARGOCD_NAMESPACE}" get applications.argoproj.io
