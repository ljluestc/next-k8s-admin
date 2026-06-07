variable "docker_host" {
  description = "Docker daemon endpoint."
  type        = string
  default     = "unix:///var/run/docker.sock"
}

variable "network_name" {
  description = "Docker network name for app and database."
  type        = string
  default     = "k8s-admin-network"
}

variable "postgres_volume_name" {
  description = "Docker volume name for Postgres persistent data."
  type        = string
  default     = "k8s-admin-pgdata"
}

variable "postgres_image" {
  description = "Postgres image."
  type        = string
  default     = "postgres:16-alpine"
}

variable "app_image" {
  description = "Application image."
  type        = string
  default     = "twwch/k8s-admin:latest"
}

variable "swagger_ui_image" {
  description = "Swagger UI image used to serve OpenAPI docs."
  type        = string
  default     = "swaggerapi/swagger-ui:v5.17.14"
}

variable "postgres_container_name" {
  description = "Postgres container name."
  type        = string
  default     = "k8s-admin-postgres-db"
}

variable "app_container_name" {
  description = "Application container name."
  type        = string
  default     = "k8s-admin"
}

variable "swagger_ui_container_name" {
  description = "Swagger UI container name."
  type        = string
  default     = "k8s-admin-swagger-ui"
}

variable "postgres_user" {
  description = "Postgres username."
  type        = string
  default     = "k8sadmin"
}

variable "postgres_password" {
  description = "Postgres password."
  type        = string
  sensitive   = true
}

variable "postgres_db" {
  description = "Postgres database name."
  type        = string
  default     = "k8sadmin"
}

variable "postgres_external_port" {
  description = "Host port mapped to Postgres container port 5432."
  type        = number
  default     = 5433
}

variable "app_external_port" {
  description = "Host port mapped to app container port 3000."
  type        = number
  default     = 3000
}

variable "enable_swagger_ui" {
  description = "Whether to run Swagger UI container for OpenAPI visualization."
  type        = bool
  default     = true
}

variable "swagger_ui_external_port" {
  description = "Host port mapped to Swagger UI container port 8080."
  type        = number
  default     = 8081
}

variable "swagger_spec_host_path" {
  description = "Optional host path to OpenAPI YAML. If empty, defaults to ../openapi/k8s-admin.yaml."
  type        = string
  default     = ""
}

variable "aws_credentials_dir" {
  description = "Host path for AWS credentials directory mounted to /root/.aws."
  type        = string
  default     = "~/.aws"
}

variable "encryption_key" {
  description = "32-byte hex key used by app to encrypt cluster credentials."
  type        = string
  sensitive   = true
}

variable "session_expiry_hours" {
  description = "JWT session expiry in hours."
  type        = number
  default     = 24
}

variable "next_public_ws_url" {
  description = "Public WebSocket URL."
  type        = string
  default     = "ws://localhost:3000/ws"
}

variable "next_public_dashboard_panel_url" {
  description = "Dashboard panel URL shown in UI."
  type        = string
  default     = ""
}
variable "next_public_argocd_panel_url" {
  description = "ArgoCD panel URL shown in UI."
  type        = string
  default     = ""
}

variable "next_public_argocd_release_dashboard_url" {
  description = "ArgoCD release dashboard URL (optional, falls back to ArgoCD panel URL when empty)."
  type        = string
  default     = ""
}

variable "next_public_prometheus_panel_url" {
  description = "Prometheus panel URL shown in UI."
  type        = string
  default     = ""
}

variable "next_public_istio_panel_url" {
  description = "Istio panel URL shown in UI."
  type        = string
  default     = ""
}

variable "next_public_falco_panel_url" {
  description = "Falco panel URL shown in UI."
  type        = string
  default     = ""
}

variable "next_public_trivy_operator_panel_url" {
  description = "Legacy Trivy Operator panel URL shown in UI (deprecated, use next_public_trivy_panel_url)."
  type        = string
  default     = ""
}

variable "next_public_trivy_panel_url" {
  description = "Trivy panel URL shown in UI."
  type        = string
  default     = ""
}

variable "next_public_kyverno_panel_url" {
  description = "Kyverno panel URL shown in UI."
  type        = string
  default     = ""
}

variable "next_public_gatekeeper_panel_url" {
  description = "OPA Gatekeeper panel URL shown in UI."
  type        = string
  default     = ""
}

variable "smtp_host" {
  description = "SMTP host."
  type        = string
  default     = ""
}

variable "smtp_port" {
  description = "SMTP port."
  type        = number
  default     = 587
}

variable "smtp_user" {
  description = "SMTP username."
  type        = string
  default     = ""
}

variable "smtp_pass" {
  description = "SMTP password."
  type        = string
  default     = ""
  sensitive   = true
}

variable "smtp_from" {
  description = "SMTP from address."
  type        = string
  default     = "noreply@k8sadmin.local"
}

variable "create_kind_cluster" {
  description = "Whether to provision a local Kind Kubernetes cluster via Terraform."
  type        = bool
  default     = false
}

variable "kind_cluster_name" {
  description = "Kind cluster name managed by Terraform."
  type        = string
  default     = "k8s-admin-kind"
}

variable "kind_node_image" {
  description = "Kind node image version."
  type        = string
  default     = "kindest/node:v1.30.0"
}

variable "kind_kubeconfig_path" {
  description = "Path where Kind kubeconfig will be written."
  type        = string
  default     = "./.generated/kubeconfig-kind.yaml"
}

variable "register_kind_cluster_in_app" {
  description = "Whether to upsert the Terraform-managed Kind cluster into the app via public APIs automatically."
  type        = bool
  default     = false
}

variable "kind_cluster_display_name" {
  description = "Display name used when upserting the Kind cluster to the app database."
  type        = string
  default     = "Terraform Kind Cluster"
}
variable "cluster_registration_api_base_url" {
  description = "Optional admin API base URL used for cluster registration. If empty, localhost + app_external_port is used."
  type        = string
  default     = ""
}

variable "cluster_registration_admin_username" {
  description = "Admin username used by the API registration client."
  type        = string
  default     = "admin"
}

variable "cluster_registration_admin_password" {
  description = "Admin password used by the API registration client when register_kind_cluster_in_app=true."
  type        = string
  default     = ""
  sensitive   = true

  validation {
    condition     = !var.register_kind_cluster_in_app || var.cluster_registration_admin_password != ""
    error_message = "cluster_registration_admin_password must be set when register_kind_cluster_in_app=true."
  }
}

variable "cluster_registration_client_runtime" {
  description = "Runtime used for API registration client. Supported values: python, go."
  type        = string
  default     = "python"

  validation {
    condition     = contains(["python", "go"], var.cluster_registration_client_runtime)
    error_message = "cluster_registration_client_runtime must be one of: python, go."
  }
}

variable "cluster_registration_cluster_description" {
  description = "Description used in cluster upsert payload."
  type        = string
  default     = "Managed by Terraform API workflow"
}

variable "cluster_registration_max_retries" {
  description = "Maximum retries for API login and cluster connectivity verification."
  type        = number
  default     = 30

  validation {
    condition     = var.cluster_registration_max_retries > 0
    error_message = "cluster_registration_max_retries must be greater than 0."
  }
}

variable "cluster_registration_retry_interval_seconds" {
  description = "Retry interval in seconds for API login and cluster connectivity verification."
  type        = number
  default     = 2

  validation {
    condition     = var.cluster_registration_retry_interval_seconds > 0
    error_message = "cluster_registration_retry_interval_seconds must be greater than 0."
  }
}
