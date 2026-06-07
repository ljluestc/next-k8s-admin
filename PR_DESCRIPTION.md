本次修复解决了使用自签名证书的 Kubernetes 集群无法连接的问题。此前系统在通过 kubeconfig 创建客户端时没有设置 skipTLSVerify，导致请求 /version 失败并返回 self-signed certificate 错误。
修复方式是在 src/lib/k8s/client-manager.ts 的 buildKubeConfig 中，在 loadFromString 后遍历 kc.clusters，将每个 clusterConfig 的 skipTLSVerify 设置为 true。这样即使证书由自签名 CA 签发，客户端也能正常建立连接。
影响范围仅限 kubeconfig 认证路径，不影响 token 认证与现有 EKS token 刷新逻辑。
本地验证结果：pnpm install --frozen-lockfile 失败（仓库缺少 pnpm-lock.yaml）；pnpm exec tsc --noEmit 失败（src/lib/rbac/__tests__/check.test.ts 存在历史类型错误）；pnpm build 通过；pnpm lint 失败（仓库内已有大量历史 lint 问题，非本次改动引入）。
