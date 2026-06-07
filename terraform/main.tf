terraform {
  required_version = ">= 1.5.0"
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

provider "docker" {
  host = var.docker_host
}

locals {
  container_database_url = "postgresql://${var.postgres_user}:${var.postgres_password}@${docker_container.db.name}:5432/${var.postgres_db}"
  aws_credentials_dir    = pathexpand(var.aws_credentials_dir)
  swagger_spec_host_path = var.swagger_spec_host_path != "" ? abspath(var.swagger_spec_host_path) : abspath("${path.module}/../openapi/k8s-admin.yaml")
  local_app_base_url     = "http://localhost:${var.app_external_port}"
  dashboard_panel_url    = trimspace(var.next_public_dashboard_panel_url) != "" ? trimspace(var.next_public_dashboard_panel_url) : local.local_app_base_url
  argocd_panel_url       = trimspace(var.next_public_argocd_panel_url) != "" ? trimspace(var.next_public_argocd_panel_url) : "${local.local_app_base_url}/apps/releases"
  argocd_release_url     = trimspace(var.next_public_argocd_release_dashboard_url) != "" ? trimspace(var.next_public_argocd_release_dashboard_url) : local.argocd_panel_url
  prometheus_panel_url   = trimspace(var.next_public_prometheus_panel_url) != "" ? trimspace(var.next_public_prometheus_panel_url) : "${local.local_app_base_url}/resources/workloads/pods"
  istio_panel_url        = trimspace(var.next_public_istio_panel_url) != "" ? trimspace(var.next_public_istio_panel_url) : "${local.local_app_base_url}/resources/networking/services"
  trivy_panel_url = trimspace(var.next_public_trivy_operator_panel_url) != "" ? trimspace(var.next_public_trivy_operator_panel_url) : (
    trimspace(var.next_public_trivy_panel_url) != "" ? trimspace(var.next_public_trivy_panel_url) : "${local.local_app_base_url}/admin/panels/trivy"
  )
  falco_panel_url      = trimspace(var.next_public_falco_panel_url) != "" ? trimspace(var.next_public_falco_panel_url) : "${local.local_app_base_url}/admin/panels/falco"
  kyverno_panel_url    = trimspace(var.next_public_kyverno_panel_url) != "" ? trimspace(var.next_public_kyverno_panel_url) : "${local.local_app_base_url}/admin/panels/kyverno"
  gatekeeper_panel_url = trimspace(var.next_public_gatekeeper_panel_url) != "" ? trimspace(var.next_public_gatekeeper_panel_url) : "${local.local_app_base_url}/admin/panels/gatekeeper"

  app_env = [
    "DATABASE_URL=${local.container_database_url}",
    "ENCRYPTION_KEY=${var.encryption_key}",
    "SESSION_EXPIRY_HOURS=${var.session_expiry_hours}",
    "NEXT_PUBLIC_WS_URL=${var.next_public_ws_url}",
    "NEXT_PUBLIC_DASHBOARD_PANEL_URL=${local.dashboard_panel_url}",
    "NEXT_PUBLIC_ARGOCD_PANEL_URL=${local.argocd_panel_url}",
    "NEXT_PUBLIC_ARGOCD_RELEASE_DASHBOARD_URL=${local.argocd_release_url}",
    "NEXT_PUBLIC_PROMETHEUS_PANEL_URL=${local.prometheus_panel_url}",
    "NEXT_PUBLIC_ISTIO_PANEL_URL=${local.istio_panel_url}",
    "NEXT_PUBLIC_TRIVY_PANEL_URL=${local.trivy_panel_url}",
    "NEXT_PUBLIC_TRIVY_OPERATOR_PANEL_URL=${local.trivy_panel_url}",
    "NEXT_PUBLIC_FALCO_PANEL_URL=${local.falco_panel_url}",
    "NEXT_PUBLIC_KYVERNO_PANEL_URL=${local.kyverno_panel_url}",
    "NEXT_PUBLIC_GATEKEEPER_PANEL_URL=${local.gatekeeper_panel_url}",
    "SMTP_HOST=${var.smtp_host}",
    "SMTP_PORT=${var.smtp_port}",
    "SMTP_USER=${var.smtp_user}",
    "SMTP_PASS=${var.smtp_pass}",
    "SMTP_FROM=${var.smtp_from}",
  ]
}

resource "docker_network" "app" {
  name = var.network_name
}

resource "docker_volume" "postgres_data" {
  name = var.postgres_volume_name
}

resource "docker_image" "postgres" {
  name         = var.postgres_image
  keep_locally = true
}

resource "docker_image" "app" {
  name         = var.app_image
  keep_locally = true
}

resource "docker_image" "swagger_ui" {
  count        = var.enable_swagger_ui ? 1 : 0
  name         = var.swagger_ui_image
  keep_locally = true
}

resource "docker_container" "db" {
  name    = var.postgres_container_name
  image   = docker_image.postgres.image_id
  restart = "unless-stopped"
  env = [
    "POSTGRES_USER=${var.postgres_user}",
    "POSTGRES_PASSWORD=${var.postgres_password}",
    "POSTGRES_DB=${var.postgres_db}",
  ]

  ports {
    internal = 5432
    external = var.postgres_external_port
  }

  volumes {
    volume_name    = docker_volume.postgres_data.name
    container_path = "/var/lib/postgresql/data"
  }

  networks_advanced {
    name = docker_network.app.name
  }
}

resource "docker_container" "swagger_ui" {
  count      = var.enable_swagger_ui ? 1 : 0
  depends_on = [docker_container.app]

  name    = var.swagger_ui_container_name
  image   = docker_image.swagger_ui[0].image_id
  restart = "unless-stopped"
  env = [
    "SWAGGER_JSON=/tmp/openapi.yaml",
  ]

  ports {
    internal = 8080
    external = var.swagger_ui_external_port
  }

  volumes {
    host_path      = local.swagger_spec_host_path
    container_path = "/tmp/openapi.yaml"
    read_only      = true
  }

  networks_advanced {
    name = docker_network.app.name
  }
}

resource "docker_container" "app" {
  depends_on = [docker_container.db, terraform_data.kind_cluster]

  name    = var.app_container_name
  image   = docker_image.app.image_id
  restart = "unless-stopped"
  env     = local.app_env

  ports {
    internal = 3000
    external = var.app_external_port
  }

  volumes {
    host_path      = local.aws_credentials_dir
    container_path = "/root/.aws"
    read_only      = true
  }

  networks_advanced {
    name = docker_network.app.name
  }

  dynamic "networks_advanced" {
    for_each = var.create_kind_cluster ? [1] : []
    content {
      name = "kind"
    }
  }
}
