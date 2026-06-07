'use client';

import { Alert, Button, Card, Col, Row, Space, Spin, Typography } from 'antd';
import { useRequest } from 'ahooks';
import PageContainer from '@/components/page-container';
import PlatformPanelCard, { type PlatformPanelData } from '@/components/platform-panel-card';
import { useClusterStore } from '@/hooks/use-cluster';
import { request } from '@/lib/request';

const { Text } = Typography;

interface PanelUrls {
  dashboard: string;
  argocd: string;
  argocdReleaseDashboard: string;
  prometheus: string;
  istio: string;
  falco: string;
  trivy: string;
  kyverno: string;
  gatekeeper: string;
}

interface PanelResponse {
  cluster?: {
    id: string;
    name: string;
    status: string;
  };
  securityPanels?: {
    falco: PlatformPanelData;
    trivy: PlatformPanelData;
    kyverno: PlatformPanelData;
    gatekeeper: PlatformPanelData;
  };
  panelUrls?: PanelUrls;
  panels?: {
    argocd: PlatformPanelData;
    prometheus: PlatformPanelData & { hasGrafana?: boolean };
    istio: PlatformPanelData & { ingressGatewayReady?: boolean };
  };
  error?: string;
}

export default function AdminPanelsPage() {
  const { clusterId } = useClusterStore();

  const { data, loading } = useRequest<PanelResponse, []>(async () => {
    const query = clusterId ? `?clusterId=${clusterId}` : '';
    const res = await request(`/api/platform-panels${query}`);
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload.error || '获取平台面板失败');
    return payload;
  }, {
    refreshDeps: [clusterId],
    pollingInterval: 30000,
  });

  const panelUrls = data?.panelUrls;
  const dashboardPanelUrl = panelUrls?.dashboard || process.env.NEXT_PUBLIC_DASHBOARD_PANEL_URL?.trim() || '/';
  const argocdPanelUrl = panelUrls?.argocd || process.env.NEXT_PUBLIC_ARGOCD_PANEL_URL?.trim() || '/apps/releases';
  const argocdReleaseDashboardUrl = panelUrls?.argocdReleaseDashboard
    || process.env.NEXT_PUBLIC_ARGOCD_RELEASE_DASHBOARD_URL?.trim()
    || argocdPanelUrl;
  const prometheusPanelUrl = panelUrls?.prometheus || process.env.NEXT_PUBLIC_PROMETHEUS_PANEL_URL?.trim() || '/resources/workloads/pods';
  const istioPanelUrl = panelUrls?.istio || process.env.NEXT_PUBLIC_ISTIO_PANEL_URL?.trim() || '/resources/networking/services';
  const falcoPanelUrl = panelUrls?.falco || process.env.NEXT_PUBLIC_FALCO_PANEL_URL?.trim() || '/admin/panels/falco';
  const trivyPanelUrl = panelUrls?.trivy
    || process.env.NEXT_PUBLIC_TRIVY_PANEL_URL?.trim()
    || process.env.NEXT_PUBLIC_TRIVY_OPERATOR_PANEL_URL?.trim()
    || '/admin/panels/trivy';
  const kyvernoPanelUrl = panelUrls?.kyverno || process.env.NEXT_PUBLIC_KYVERNO_PANEL_URL?.trim() || '/admin/panels/kyverno';
  const gatekeeperPanelUrl = panelUrls?.gatekeeper || process.env.NEXT_PUBLIC_GATEKEEPER_PANEL_URL?.trim() || '/admin/panels/gatekeeper';

  return (
    <Spin spinning={loading && !data}>
      <PageContainer
        title="平台面板"
        description="Admin 视图：集中查看 Dashboard、ArgoCD、Prometheus、Istio 与 CNCF 安全组件健康状态"
      >
        <div style={{ padding: '20px 24px' }}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Alert
              type="info"
              showIcon
              message={`当前集群：${data?.cluster?.name || '未选择'}`}
              description="面板每 30 秒自动刷新一次状态。"
            />
            {data?.error && <Alert type="warning" showIcon message={data.error} />}

            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12} xl={6}>
                <Card title="Dashboard 面板" style={{ borderRadius: 12, height: '100%' }}>
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <Text type="secondary">外部运维总览看板入口（未配置时自动回退到系统主页）。</Text>
                    <Button type="primary" href={dashboardPanelUrl} target="_blank" rel="noreferrer">
                      打开外部 Dashboard
                    </Button>
                    <Button href="/admin/panels/dashboard">在系统内嵌查看</Button>
                  </Space>
                </Card>
              </Col>

              <Col xs={24} lg={12} xl={6}>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <PlatformPanelCard
                    title="ArgoCD 面板"
                    data={data?.panels?.argocd}
                  />
                  <Space wrap>
                    <Button href="/admin/panels/argocd">系统内嵌查看</Button>
                    <Button href="/apps/releases">发布记录看板</Button>
                    <Button href={argocdPanelUrl} target="_blank" rel="noreferrer">
                      外部打开
                    </Button>
                    <Button href={argocdReleaseDashboardUrl} target="_blank" rel="noreferrer">
                      打开 Release Dashboard
                    </Button>
                  </Space>
                </Space>
              </Col>

              <Col xs={24} lg={12} xl={6}>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <PlatformPanelCard
                    title="Prometheus 面板"
                    data={data?.panels?.prometheus}
                    extra={data?.panels?.prometheus?.hasGrafana
                      ? <Text type="success">Grafana 已检测</Text>
                      : <Text type="secondary">Grafana 未检测</Text>}
                  />
                  <Space wrap>
                    <Button href="/admin/panels/prometheus">系统内嵌查看</Button>
                    <Button href={prometheusPanelUrl} target="_blank" rel="noreferrer">
                      外部打开
                    </Button>
                  </Space>
                </Space>
              </Col>

              <Col xs={24} lg={12} xl={6}>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <PlatformPanelCard
                    title="Istio 面板"
                    data={data?.panels?.istio}
                    extra={data?.panels?.istio?.ingressGatewayReady
                      ? <Text type="success">IngressGateway 就绪</Text>
                      : <Text type="secondary">IngressGateway 未就绪</Text>}
                  />
                  <Space wrap>
                    <Button href="/admin/panels/istio">系统内嵌查看</Button>
                    <Button href={istioPanelUrl} target="_blank" rel="noreferrer">
                      外部打开
                    </Button>
                  </Space>
                </Space>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card
                  title="CNCF 安全工具"
                  style={{ borderRadius: 12 }}
                  extra={<Text type="secondary">Falco · Trivy Operator · Kyverno · OPA Gatekeeper</Text>}
                >
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={12} xl={6}>
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        <PlatformPanelCard title="Falco" data={data?.securityPanels?.falco} />
                        <Space wrap>
                          <Button href="/admin/panels/falco">系统内嵌查看</Button>
                          <Button href={falcoPanelUrl} target="_blank" rel="noreferrer">外部打开</Button>
                        </Space>
                      </Space>
                    </Col>
                    <Col xs={24} md={12} xl={6}>
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        <PlatformPanelCard title="Trivy Operator" data={data?.securityPanels?.trivy} />
                        <Space wrap>
                          <Button href="/admin/panels/trivy">系统内嵌查看</Button>
                          <Button href={trivyPanelUrl} target="_blank" rel="noreferrer">外部打开</Button>
                        </Space>
                      </Space>
                    </Col>
                    <Col xs={24} md={12} xl={6}>
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        <PlatformPanelCard title="Kyverno" data={data?.securityPanels?.kyverno} />
                        <Space wrap>
                          <Button href="/admin/panels/kyverno">系统内嵌查看</Button>
                          <Button href={kyvernoPanelUrl} target="_blank" rel="noreferrer">外部打开</Button>
                        </Space>
                      </Space>
                    </Col>
                    <Col xs={24} md={12} xl={6}>
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        <PlatformPanelCard title="OPA Gatekeeper" data={data?.securityPanels?.gatekeeper} />
                        <Space wrap>
                          <Button href="/admin/panels/gatekeeper">系统内嵌查看</Button>
                          <Button href={gatekeeperPanelUrl} target="_blank" rel="noreferrer">外部打开</Button>
                        </Space>
                      </Space>
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>
          </Space>
        </div>
      </PageContainer>
    </Spin>
  );
}