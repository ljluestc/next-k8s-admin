locals {
  kind_kubeconfig_path      = abspath(var.kind_kubeconfig_path)
  registration_database_url = var.cluster_registration_database_url != "" ? var.cluster_registration_database_url : "postgresql://${var.postgres_user}:${var.postgres_password}@127.0.0.1:${var.postgres_external_port}/${var.postgres_db}"
}

resource "terraform_data" "kind_cluster" {
  count = var.create_kind_cluster ? 1 : 0

  input = {
    cluster_name    = var.kind_cluster_name
    node_image      = var.kind_node_image
    kubeconfig_path = local.kind_kubeconfig_path
  }

  triggers_replace = [
    var.kind_cluster_name,
    var.kind_node_image,
    local.kind_kubeconfig_path,
  ]

  provisioner "local-exec" {
    command = <<-EOT
      set -eu
      if ! command -v kind >/dev/null 2>&1; then
        echo "kind CLI is required when create_kind_cluster=true." >&2
        exit 1
      fi
      mkdir -p "$(dirname "${self.input.kubeconfig_path}")"
      if kind get clusters | grep -qx "${self.input.cluster_name}"; then
        kind export kubeconfig --name "${self.input.cluster_name}" --kubeconfig "${self.input.kubeconfig_path}"
      else
        kind create cluster --name "${self.input.cluster_name}" --image "${self.input.node_image}" --kubeconfig "${self.input.kubeconfig_path}"
      fi
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
    EOT
  }
}

resource "terraform_data" "register_kind_cluster_in_app" {
  count = var.create_kind_cluster && var.register_kind_cluster_in_app ? 1 : 0

  input = {
    cluster_name   = var.kind_cluster_name
    display_name   = var.kind_cluster_display_name
    kubeconfig     = local.kind_kubeconfig_path
    database_url   = local.registration_database_url
    encryption_key = var.encryption_key
    project_root   = abspath("${path.module}/..")
  }

  depends_on = [
    docker_container.app,
    terraform_data.kind_cluster,
  ]

  triggers_replace = [
    var.kind_cluster_name,
    var.kind_cluster_display_name,
    local.kind_kubeconfig_path,
    local.registration_database_url,
  ]

  provisioner "local-exec" {
    command = <<-EOT
      set -eu
      if ! command -v npx >/dev/null 2>&1; then
        echo "npx is required when register_kind_cluster_in_app=true." >&2
        exit 1
      fi

      cd "${self.input.project_root}"
      attempt=0
      until DATABASE_URL="${self.input.database_url}" ENCRYPTION_KEY="${self.input.encryption_key}" npx tsx scripts/upsert-cluster-from-kubeconfig.ts --name "${self.input.cluster_name}" --display-name "${self.input.display_name}" --kubeconfig "${self.input.kubeconfig}"; do
        attempt=$((attempt + 1))
        if [ "$attempt" -ge 30 ]; then
          echo "cluster registration failed after $attempt attempts." >&2
          exit 1
        fi
        sleep 2
      done
    EOT
  }
}
