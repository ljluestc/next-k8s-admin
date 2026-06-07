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

  app_env = [
    "DATABASE_URL=${local.container_database_url}",
    "ENCRYPTION_KEY=${var.encryption_key}",
    "SESSION_EXPIRY_HOURS=${var.session_expiry_hours}",
    "NEXT_PUBLIC_WS_URL=${var.next_public_ws_url}",
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

resource "docker_container" "app" {
  depends_on = [docker_container.db]

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
}
