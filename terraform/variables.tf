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
  description = "Whether to upsert the Terraform-managed Kind cluster into the app database automatically."
  type        = bool
  default     = false
}

variable "kind_cluster_display_name" {
  description = "Display name used when upserting the Kind cluster to the app database."
  type        = string
  default     = "Terraform Kind Cluster"
}

variable "cluster_registration_database_url" {
  description = "Optional DATABASE_URL used when registering cluster into app DB. If empty, localhost with postgres_* vars is used."
  type        = string
  default     = ""
  sensitive   = true
}
