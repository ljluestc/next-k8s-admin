output "app_url" {
  description = "Application URL."
  value       = "http://localhost:${var.app_external_port}"
}

output "app_container_name" {
  description = "Managed application container name."
  value       = docker_container.app.name
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

output "kind_kubeconfig_content" {
  description = "Kubeconfig content for Terraform managed Kind cluster."
  value       = var.create_kind_cluster && can(file(local.kind_kubeconfig_path)) ? file(local.kind_kubeconfig_path) : null
  sensitive   = true
}
