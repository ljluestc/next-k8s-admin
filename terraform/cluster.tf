locals {
  kind_kubeconfig_path          = abspath(var.kind_kubeconfig_path)
  kind_internal_kubeconfig_path = "${dirname(local.kind_kubeconfig_path)}/${trimsuffix(basename(local.kind_kubeconfig_path), ".yaml")}-internal.yaml"
  registration_api_base_url     = var.cluster_registration_api_base_url != "" ? var.cluster_registration_api_base_url : "http://127.0.0.1:${var.app_external_port}"
}

resource "terraform_data" "kind_cluster" {
  count = var.create_kind_cluster ? 1 : 0

  input = {
    cluster_name             = var.kind_cluster_name
    node_image               = var.kind_node_image
    kubeconfig_path          = local.kind_kubeconfig_path
    internal_kubeconfig_path = local.kind_internal_kubeconfig_path
  }

  triggers_replace = [
    var.kind_cluster_name,
    var.kind_node_image,
    local.kind_kubeconfig_path,
    local.kind_internal_kubeconfig_path,
  ]

  provisioner "local-exec" {
    command = <<-EOT
      set -eu
      if ! command -v kind >/dev/null 2>&1; then
        echo "kind CLI is required when create_kind_cluster=true." >&2
        exit 1
      fi
      mkdir -p "$(dirname "${self.input.kubeconfig_path}")"
      mkdir -p "$(dirname "${self.input.internal_kubeconfig_path}")"
      if kind get clusters | grep -qx "${self.input.cluster_name}"; then
        kind export kubeconfig --name "${self.input.cluster_name}" --kubeconfig "${self.input.kubeconfig_path}"
      else
        kind create cluster --name "${self.input.cluster_name}" --image "${self.input.node_image}" --kubeconfig "${self.input.kubeconfig_path}"
      fi
      kind get kubeconfig --name "${self.input.cluster_name}" --internal > "${self.input.internal_kubeconfig_path}"
    EOT
  }

  provisioner "local-exec" {
    when    = destroy
    command = <<-EOT
      set +e
      if command -v kind >/dev/null 2>&1 && kind get clusters | grep -qx "${self.input.cluster_name}"; then
        kind delete cluster --name "${self.input.cluster_name}"
      fi
      rm -f "${self.input.kubeconfig_path}"
      rm -f "$(dirname "${self.input.kubeconfig_path}")/$(basename "${self.input.kubeconfig_path}" .yaml)-internal.yaml"
    EOT
  }
}

resource "terraform_data" "register_kind_cluster_in_app" {
  count = var.create_kind_cluster && var.register_kind_cluster_in_app ? 1 : 0

  input = {
    cluster_name           = var.kind_cluster_name
    display_name           = var.kind_cluster_display_name
    kubeconfig             = local.kind_internal_kubeconfig_path
    project_root           = abspath("${path.module}/..")
    api_base_url           = local.registration_api_base_url
    admin_username         = var.cluster_registration_admin_username
    client_runtime         = var.cluster_registration_client_runtime
    cluster_description    = var.cluster_registration_cluster_description
    max_retries            = var.cluster_registration_max_retries
    retry_interval_seconds = var.cluster_registration_retry_interval_seconds
  }

  depends_on = [
    docker_container.app,
    terraform_data.kind_cluster,
  ]

  triggers_replace = [
    var.kind_cluster_name,
    var.kind_cluster_display_name,
    local.kind_kubeconfig_path,
    local.registration_api_base_url,
    var.cluster_registration_admin_username,
    var.cluster_registration_client_runtime,
    var.cluster_registration_cluster_description,
    var.cluster_registration_max_retries,
    var.cluster_registration_retry_interval_seconds,
  ]

  provisioner "local-exec" {
    environment = {
      ADMIN_API_PASSWORD = var.cluster_registration_admin_password
    }
    command = <<-EOT
      set -eu
      if [ -z "$${ADMIN_API_PASSWORD}" ]; then
        echo "cluster_registration_admin_password is required when register_kind_cluster_in_app=true." >&2
        exit 1
      fi
      CLUSTER_CONTROL_PLANE_URL="https://${self.input.cluster_name}-control-plane:6443"
      REGISTER_KUBECONFIG="$(mktemp)"
      trap 'rm -f "$${REGISTER_KUBECONFIG}"' EXIT

      if grep -Eq 'server:[[:space:]]*https://127\\.0\\.0\\.1:[0-9]+' "${self.input.kubeconfig}"; then
        sed -E "s#server:[[:space:]]*https://127\\.0\\.0\\.1:[0-9]+#server: $${CLUSTER_CONTROL_PLANE_URL}#g" "${self.input.kubeconfig}" > "$${REGISTER_KUBECONFIG}"
      else
        cp "${self.input.kubeconfig}" "$${REGISTER_KUBECONFIG}"
      fi

      cd "${self.input.project_root}"
      if [ "${self.input.client_runtime}" = "python" ]; then
        if ! command -v python3 >/dev/null 2>&1; then
          echo "python3 is required when cluster_registration_client_runtime=python." >&2
          exit 1
        fi
        python3 scripts/python/launch_admin_via_api.py \
          --base-url "${self.input.api_base_url}" \
          --username "${self.input.admin_username}" \
          --password-env ADMIN_API_PASSWORD \
          --upsert-cluster \
          --cluster-name "${self.input.cluster_name}" \
          --cluster-display-name "${self.input.display_name}" \
          --cluster-description "${self.input.cluster_description}" \
          --kubeconfig "$${REGISTER_KUBECONFIG}" \
          --api-server-url "$${CLUSTER_CONTROL_PLANE_URL}" \
          --test-cluster \
          --max-retries "${self.input.max_retries}" \
          --retry-interval-seconds "${self.input.retry_interval_seconds}"
      elif [ "${self.input.client_runtime}" = "go" ]; then
        if ! command -v go >/dev/null 2>&1; then
          echo "go is required when cluster_registration_client_runtime=go." >&2
          exit 1
        fi
        go run scripts/go/launch_admin_via_api.go \
          --base-url "${self.input.api_base_url}" \
          --username "${self.input.admin_username}" \
          --password-env ADMIN_API_PASSWORD \
          --upsert-cluster \
          --cluster-name "${self.input.cluster_name}" \
          --cluster-display-name "${self.input.display_name}" \
          --cluster-description "${self.input.cluster_description}" \
          --kubeconfig "$${REGISTER_KUBECONFIG}" \
          --api-server-url "$${CLUSTER_CONTROL_PLANE_URL}" \
          --test-cluster \
          --max-retries "${self.input.max_retries}" \
          --retry-interval-seconds "${self.input.retry_interval_seconds}"
      else
        echo "unsupported cluster_registration_client_runtime=${self.input.client_runtime}" >&2
        exit 1
      fi
    EOT
  }
}
