output "app_url" {
  description = "Application URL."
  value       = "http://localhost:${var.app_external_port}"
}

output "swagger_ui_url" {
  description = "Swagger UI URL (if enabled)."
  value       = var.enable_swagger_ui ? "http://localhost:${var.swagger_ui_external_port}" : null
}

output "app_container_name" {
  description = "Managed application container name."
  value       = docker_container.app.name
}

output "swagger_ui_container_name" {
  description = "Managed Swagger UI container name."
  value       = var.enable_swagger_ui ? docker_container.swagger_ui[0].name : null
}

output "postgres_container_name" {
  description = "Managed Postgres container name."
  value       = docker_container.db.name
}

output "postgres_local_url" {
  description = "Postgres URL reachable from host."
  value       = "postgresql://${var.postgres_user}:${var.postgres_password}@127.0.0.1:${var.postgres_external_port}/${var.postgres_db}"
  sensitive   = true
}

output "kind_cluster_name" {
  description = "Terraform managed Kind cluster name."
  value       = var.create_kind_cluster ? var.kind_cluster_name : null
}

output "kind_kubeconfig_path" {
  description = "Kubeconfig path for Terraform managed Kind cluster."
  value       = var.create_kind_cluster ? local.kind_kubeconfig_path : null
}
output "kind_internal_kubeconfig_path" {
  description = "Internal kubeconfig path for Terraform managed Kind cluster (Docker network endpoint)."
  value       = var.create_kind_cluster ? local.kind_internal_kubeconfig_path : null
}

output "kind_kubeconfig_content" {
  description = "Kubeconfig content for Terraform managed Kind cluster."
  value       = var.create_kind_cluster && can(file(local.kind_kubeconfig_path)) ? file(local.kind_kubeconfig_path) : null
  sensitive   = true
}

output "openapi_spec_host_path" {
  description = "OpenAPI spec path mounted into Swagger UI."
  value       = local.swagger_spec_host_path
}
