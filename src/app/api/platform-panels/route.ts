import { NextRequest, NextResponse } from 'next/server';
import { inArray } from 'drizzle-orm';
import type { V1Deployment, V1Pod, V1Service } from '@kubernetes/client-node';
import { db } from '@/lib/db';
import { clusters } from '@/lib/db/schema';
import { validateSession } from '@/lib/auth/session';
import { isSuperAdmin } from '@/lib/auth/admin-check';
import { getUserAccessibleClusterIds } from '@/lib/rbac/check';
import { getK8sClient } from '@/lib/k8s/client-manager';

type KeyDeploymentSummary = {
  name: string;
  ready: boolean;
  readyReplicas: number;
  replicas: number;
};

type PanelSummary = {
  namespace: string;
  installed: boolean;
  deploymentCount: number;
  readyDeploymentCount: number;
  podCount: number;
  runningPodCount: number;
  serviceCount: number;
  keyDeployments: KeyDeploymentSummary[];
};

type SecurityPanels = {
  falco: PanelSummary;
  trivy: PanelSummary;
  kyverno: PanelSummary;
  gatekeeper: PanelSummary;
};

type K8sClients = Awaited<ReturnType<typeof getK8sClient>>;

type ErrorLike = {
  statusCode?: number;
  response?: { statusCode?: number };
  body?: { code?: number };
  message?: string;
};

function toErrorLike(err: unknown): ErrorLike {
  return typeof err === 'object' && err !== null ? err as ErrorLike : {};
}

function createEmptyPanel(namespace: string): PanelSummary {
  return {
    namespace,
    installed: false,
    deploymentCount: 0,
    readyDeploymentCount: 0,
    podCount: 0,
    runningPodCount: 0,
    serviceCount: 0,
    keyDeployments: [],
  };
}

function isNotFoundError(err: unknown): boolean {
  const parsed = toErrorLike(err);
  const code = parsed.statusCode || parsed.response?.statusCode || parsed.body?.code;
  const message = String(parsed.message || '').toLowerCase();
  return code === 404 || message.includes('not found');
}

async function safeList<T>(fn: () => Promise<{ items?: T[] }>): Promise<T[]> {
  try {
    const result = await fn();
    return result.items || [];
  } catch (err: unknown) {
    if (isNotFoundError(err)) return [];
    throw err;
  }
}

function summarizeKeyDeployments(deployments: V1Deployment[], matchers: string[]): KeyDeploymentSummary[] {
  return deployments
    .filter((dep) => {
      const name = String(dep.metadata?.name || '');
      return matchers.some((matcher) => name.includes(matcher));
    })
    .map((dep) => {
      const replicas = Number(dep.spec?.replicas ?? 1);
      const readyReplicas = Number(dep.status?.readyReplicas || 0);
      return {
        name: String(dep.metadata?.name || 'unknown'),
        ready: readyReplicas >= replicas,
        readyReplicas,
        replicas,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function getNamespacePanel(clients: K8sClients, namespace: string, keyMatchers: string[]): Promise<PanelSummary> {
  const deployments = await safeList<V1Deployment>(() => clients.apps.listNamespacedDeployment({ namespace }));
  const pods = await safeList<V1Pod>(() => clients.core.listNamespacedPod({ namespace }));
  const services = await safeList<V1Service>(() => clients.core.listNamespacedService({ namespace }));

  const readyDeploymentCount = deployments.filter((dep) => {
    const replicas = Number(dep.spec?.replicas ?? 1);
    const readyReplicas = Number(dep.status?.readyReplicas || 0);
    return readyReplicas >= replicas;
  }).length;
  const runningPodCount = pods.filter((pod) => pod.status?.phase === 'Running').length;

  return {
    namespace,
    installed: deployments.length > 0 || pods.length > 0 || services.length > 0,
    deploymentCount: deployments.length,
    readyDeploymentCount,
    podCount: pods.length,
    runningPodCount,
    serviceCount: services.length,
    keyDeployments: summarizeKeyDeployments(deployments, keyMatchers),
  };
}

function getDefaultSecurityPanels(): SecurityPanels {
  return {
    falco: createEmptyPanel('falco'),
    trivy: createEmptyPanel('trivy-system'),
    kyverno: createEmptyPanel('kyverno'),
    gatekeeper: createEmptyPanel('gatekeeper-system'),
  };
}

function getDefaultPanels() {
  return {
    argocd: createEmptyPanel('argocd'),
    prometheus: { ...createEmptyPanel('monitoring'), hasGrafana: false },
    istio: { ...createEmptyPanel('istio-system'), ingressGatewayReady: false },
  };
}

function getPanelUrls() {
  const argocd = process.env.NEXT_PUBLIC_ARGOCD_PANEL_URL?.trim() || '';
  const trivy = process.env.NEXT_PUBLIC_TRIVY_PANEL_URL?.trim()
    || process.env.NEXT_PUBLIC_TRIVY_OPERATOR_PANEL_URL?.trim()
    || '';
  return {
    dashboard: process.env.NEXT_PUBLIC_DASHBOARD_PANEL_URL?.trim() || '',
    argocd,
    argocdReleaseDashboard: process.env.NEXT_PUBLIC_ARGOCD_RELEASE_DASHBOARD_URL?.trim() || argocd,
    prometheus: process.env.NEXT_PUBLIC_PROMETHEUS_PANEL_URL?.trim() || '',
    istio: process.env.NEXT_PUBLIC_ISTIO_PANEL_URL?.trim() || '',
    falco: process.env.NEXT_PUBLIC_FALCO_PANEL_URL?.trim() || '',
    trivy,
    kyverno: process.env.NEXT_PUBLIC_KYVERNO_PANEL_URL?.trim() || '',
    gatekeeper: process.env.NEXT_PUBLIC_GATEKEEPER_PANEL_URL?.trim() || '',
  };
}

export async function GET(req: NextRequest) {
  const auth = await validateSession();
  if (!auth) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const selectedClusterId = req.nextUrl.searchParams.get('clusterId');
  const [accessibleIds, superAdmin] = await Promise.all([
    getUserAccessibleClusterIds(auth.user.id),
    isSuperAdmin(auth.user.id),
  ]);
  const effectiveAccessibleIds = superAdmin ? null : accessibleIds;

  if (effectiveAccessibleIds !== null && effectiveAccessibleIds.length === 0) {
    return NextResponse.json({ error: '无可访问集群' }, { status: 403 });
  }
  const availableClusters = effectiveAccessibleIds === null
    ? await db.select({
      id: clusters.id,
      name: clusters.name,
      displayName: clusters.displayName,
      status: clusters.status,
    }).from(clusters)
    : await db.select({
      id: clusters.id,
      name: clusters.name,
      displayName: clusters.displayName,
      status: clusters.status,
    }).from(clusters).where(inArray(clusters.id, effectiveAccessibleIds));

  if (availableClusters.length === 0) {
    return NextResponse.json({ error: '暂无集群' }, { status: 404 });
  }

  const targetCluster = selectedClusterId
    ? availableClusters.find((item) => item.id === selectedClusterId)
    : (availableClusters.find((item) => item.status === 'connected') || availableClusters[0]);

  if (!targetCluster) {
    return NextResponse.json({ error: '无权限访问目标集群' }, { status: 403 });
  }

  const clusterInfo = {
    id: targetCluster.id,
    name: targetCluster.displayName || targetCluster.name,
    status: targetCluster.status,
  };
  const defaultPanels = getDefaultPanels();
  const defaultSecurityPanels = getDefaultSecurityPanels();
  const panelUrls = getPanelUrls();

  if (targetCluster.status !== 'connected') {
    return NextResponse.json({
      cluster: clusterInfo,
      panelUrls,
      panels: defaultPanels,
      securityPanels: defaultSecurityPanels,
      error: '当前集群未连接，无法读取面板状态',
    });
  }

  try {
    const clients = await getK8sClient(targetCluster.id);
    const argocd = await getNamespacePanel(clients, 'argocd', [
      'argocd-server',
      'argocd-repo-server',
      'argocd-application-controller',
      'argocd-dex-server',
    ]);
    const prometheus = await getNamespacePanel(clients, 'monitoring', [
      'prometheus',
      'alertmanager',
      'grafana',
      'thanos',
    ]);
    const istio = await getNamespacePanel(clients, 'istio-system', [
      'istiod',
      'istio-ingressgateway',
      'istio-egressgateway',
      'ztunnel',
    ]);
    const falco = await getNamespacePanel(clients, 'falco', [
      'falco',
      'falco-sidekick',
      'falcosidekick',
      'falco-exporter',
    ]);
    const trivy = await getNamespacePanel(clients, 'trivy-system', [
      'trivy-operator',
      'trivy-adapter',
      'trivy',
    ]);
    const kyverno = await getNamespacePanel(clients, 'kyverno', [
      'kyverno',
      'kyverno-admission-controller',
      'kyverno-background-controller',
      'kyverno-reports-controller',
      'kyverno-cleanup-controller',
    ]);
    const gatekeeper = await getNamespacePanel(clients, 'gatekeeper-system', [
      'gatekeeper',
      'gatekeeper-controller-manager',
      'gatekeeper-audit',
    ]);

    return NextResponse.json({
      cluster: clusterInfo,
      panelUrls,
      panels: {
        argocd,
        prometheus: {
          ...prometheus,
          hasGrafana: prometheus.keyDeployments.some((item) => item.name.includes('grafana')),
        },
        istio: {
          ...istio,
          ingressGatewayReady: istio.keyDeployments.some(
            (item) => item.name.includes('ingressgateway') && item.ready,
          ),
        },
      },
      securityPanels: {
        falco,
        trivy,
        kyverno,
        gatekeeper,
      },
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : '读取面板状态失败';
    return NextResponse.json({
      cluster: clusterInfo,
      panelUrls,
      panels: defaultPanels,
      securityPanels: defaultSecurityPanels,
      error,
    });
  }
}