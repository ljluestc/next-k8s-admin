# Terraform 部署与集群接入
该目录提供两类 Terraform 能力：
- Docker 部署 `k8s-admin` + PostgreSQL
- 可选：创建本地 Kind 集群并自动注册到 `k8s-admin` 的 `clusters` 表

## 前置要求
- Docker
- Terraform >= 1.5
- Node.js + npx（仅当启用自动注册集群）
- kind CLI（仅当启用 `create_kind_cluster=true`）

## 快速开始
在仓库根目录执行：

```bash
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
terraform -chdir=terraform init
terraform -chdir=terraform apply
```

应用默认暴露在：
- `http://localhost:3000`

## 启用 Terraform 管理 Kind 集群
在 `terraform/terraform.tfvars` 中启用：

```hcl
create_kind_cluster          = true
register_kind_cluster_in_app = true
kind_cluster_name            = "k8s-admin-kind"
kind_cluster_display_name    = "Terraform Kind Cluster"
kind_kubeconfig_path         = "./.generated/kubeconfig-kind.yaml"
```

说明：
- `create_kind_cluster=true`：Terraform 会创建/复用 Kind 集群，并输出 kubeconfig 路径
- `register_kind_cluster_in_app=true`：Terraform 会调用 `scripts/upsert-cluster-from-kubeconfig.ts`，将该集群 upsert 到应用数据库

若只创建 Kind 集群但不自动注册，可将 `register_kind_cluster_in_app=false`，然后将输出的 kubeconfig 内容手动粘贴到页面“添加集群”中。

## 关键变量
- `postgres_password`（必填）
- `encryption_key`（必填，32 字节 hex）
- `app_image`（默认 `twwch/k8s-admin:latest`）
- `cluster_registration_database_url`（可选，默认使用 localhost + `postgres_*`）

## 常用命令
```bash
terraform -chdir=terraform plan
terraform -chdir=terraform apply
terraform -chdir=terraform output
terraform -chdir=terraform destroy
```
