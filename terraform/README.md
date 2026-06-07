# Terraform 部署与集群接入
该目录提供以下 Terraform 能力：
- Docker 部署 `k8s-admin` + PostgreSQL
- 可选：启动 Swagger UI（挂载仓库内 `openapi/k8s-admin.yaml`）
- 可选：创建本地 Kind 集群并通过 Admin API 自动 upsert 到 `k8s-admin`

## 前置要求
- Docker
- Terraform >= 1.5
- kind CLI（仅当启用 `create_kind_cluster=true`）
- Python 3（当 `cluster_registration_client_runtime=python`）
- Go（当 `cluster_registration_client_runtime=go`）

## 快速开始
在仓库根目录执行：

```bash
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
terraform -chdir=terraform init
terraform -chdir=terraform apply
```

应用默认暴露在：
- `http://localhost:3000`
- `http://localhost:8081`（Swagger UI，默认启用）
## 与现有 `:3002` 实例并行（示例：`3004/5434/8082`）
在 `terraform/terraform.tfvars` 中覆盖端口后再 `apply`：

```hcl
app_external_port = 3004
postgres_external_port = 5434
swagger_ui_external_port = 8082
cluster_registration_api_base_url = "http://127.0.0.1:3004"
```

## 启用 Terraform 管理 Kind 集群
在 `terraform/terraform.tfvars` 中启用：

```hcl
create_kind_cluster          = true
register_kind_cluster_in_app = true
kind_cluster_name            = "k8s-admin-kind"
kind_cluster_display_name    = "Terraform Kind Cluster"
kind_kubeconfig_path         = "./.generated/kubeconfig-kind.yaml"
cluster_registration_admin_username = "admin"
cluster_registration_admin_password = "your-admin-password"
cluster_registration_client_runtime = "python" # 或 "go"
```

说明：
- `create_kind_cluster=true`：Terraform 会创建/复用 Kind 集群，并输出 kubeconfig 路径
- `register_kind_cluster_in_app=true`：Terraform 会调用 API 客户端脚本（Python/Go）执行：
  1) 登录 `/api/auth/login`
  2) 查询 `/api/clusters`
  3) POST 或 PUT 完成 upsert
  4) 调用 `/api/clusters/{id}/test` 验证连通性
- 当同时启用 `create_kind_cluster=true` 时，Terraform 会额外生成内部 kubeconfig（`*-internal.yaml`），并让 `k8s-admin` 容器加入 `kind` 网络，避免容器内访问 `127.0.0.1` 导致集群连通性失败。

若只创建 Kind 集群但不自动注册，可将 `register_kind_cluster_in_app=false`，然后将输出 kubeconfig 手动粘贴到页面“添加集群”中。

## 关键变量
- `postgres_password`（必填）
- `encryption_key`（必填，32 字节 hex）
- `app_image`（默认 `twwch/k8s-admin:latest`）
- `enable_swagger_ui`（默认 `true`）
- `swagger_ui_external_port`（默认 `8081`）
- `swagger_spec_host_path`（默认 `../openapi/k8s-admin.yaml`）
- `cluster_registration_admin_username`（默认 `admin`）
- `cluster_registration_admin_password`（当 `register_kind_cluster_in_app=true` 时必填）
- `cluster_registration_client_runtime`（`python` 或 `go`，默认 `python`）
- `cluster_registration_api_base_url`（可选，默认 `http://127.0.0.1:${app_external_port}`）
- `cluster_registration_max_retries`（默认 `30`）
- `cluster_registration_retry_interval_seconds`（默认 `2`）
- `next_public_dashboard_panel_url`（可选，Dashboard 面板地址）
- `next_public_argocd_panel_url`（可选，ArgoCD 面板地址）
- `next_public_argocd_release_dashboard_url`（可选，ArgoCD 发布看板地址）
- `next_public_prometheus_panel_url`（可选，Prometheus 面板地址）
- `next_public_istio_panel_url`（可选，Istio 面板地址）
- `next_public_trivy_panel_url`（可选，Trivy 安全面板地址）
- `next_public_trivy_operator_panel_url`（可选，历史兼容变量，效果同上）
- `next_public_falco_panel_url`（可选，Falco 安全面板地址）
- `next_public_kyverno_panel_url`（可选，Kyverno 策略面板地址）
- `next_public_gatekeeper_panel_url`（可选，Gatekeeper 策略审计面板地址）

## 常用命令
```bash
terraform -chdir=terraform plan
terraform -chdir=terraform apply
terraform -chdir=terraform output
terraform -chdir=terraform destroy
```

## Terraform State 导出/导入（用于后续迁移或恢复）
导出当前 state：

```bash
bash scripts/terraform_export_state.sh
```

导入已备份 state（导入前会自动备份当前 state）：

```bash
bash scripts/terraform_import_state.sh terraform/state-backups/terraform-state-YYYYMMDD-HHMMSS.tfstate --yes
```

如需检查当前 state 资源：

```bash
terraform -chdir=terraform state list
```

## Swagger + Python + Go 启动/验证同一套 Admin API
Terraform `apply` 后：
- Admin：`terraform -chdir=terraform output app_url`
- Swagger UI：`terraform -chdir=terraform output swagger_ui_url`

OpenAPI 合约：
- 启动流程合约：`openapi/admin-launch.yaml`
- 完整 API 合约：`openapi/k8s-admin.yaml`

Python 启动/验证示例：

```bash
python3 scripts/python/launch_admin_via_api.py \
  --base-url http://127.0.0.1:3000 \
  --username admin \
  --password '<admin-password>' \
  --upsert-cluster \
  --cluster-name k8s-admin-kind \
  --cluster-display-name "Terraform Kind Cluster" \
  --kubeconfig terraform/.generated/kubeconfig-kind.yaml \
  --test-cluster
```

Go 启动/验证示例：

```bash
go run scripts/go/launch_admin_via_api.go \
  --base-url http://127.0.0.1:3000 \
  --username admin \
  --password '<admin-password>' \
  --upsert-cluster \
  --cluster-name k8s-admin-kind \
  --cluster-display-name "Terraform Kind Cluster" \
  --kubeconfig terraform/.generated/kubeconfig-kind.yaml \
  --test-cluster
```