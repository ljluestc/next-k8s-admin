'use client';

import type { ReactNode } from 'react';
import { Card, Col, Row, List, Tag, Typography, Spin, Button, Space } from 'antd';
import {
  ClusterOutlined,
  RocketOutlined,
  CloudOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
  DeploymentUnitOutlined,
  AreaChartOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { useRouter } from 'next/navigation';
import StatCard from '@/components/stat-card';
import { request } from '@/lib/request';

const { Text } = Typography;

interface DashboardEvent {
  type?: string;
  object?: string;
  namespace?: string;
  cluster?: string;
  reason?: string;
  message?: string;
  time?: string;
}

interface DashboardClusterStatus {
  name?: string;
  status?: string;
  nodes?: number;
  pods?: number;
}

interface DashboardData {
  clusterCount?: number;
  podCount?: number;
  deploymentCount?: number;
  todayReleaseCount?: number;
  events?: DashboardEvent[];
  clusters?: DashboardClusterStatus[];
}

interface PanelLink {
  key: string;
  name: string;
  description: string;
  icon: ReactNode;
  embeddedPath: string;
  url?: string;
}

const statusIcon: Record<string, ReactNode> = {
  connected: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
  disconnected: <MinusCircleOutlined style={{ color: '#8c8c8c' }} />,
  error: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
};

const eventTypeColor: Record<string, string> = {
  Normal: 'green',
  Warning: 'orange',
};

const panelLinks: PanelLink[] = [
  {
    key: 'dashboard',
    name: 'Dashboard',
    description: '外部运维总览看板入口',
    icon: <AppstoreOutlined style={{ color: '#f59e0b' }} />,
    embeddedPath: '/admin/panels/dashboard',
    url: process.env.NEXT_PUBLIC_DASHBOARD_PANEL_URL || '/',
  },
  {
    key: 'argocd',
    name: 'ArgoCD',
    description: '应用持续交付与发布管理',
    icon: <DeploymentUnitOutlined style={{ color: '#326CE5' }} />,
    embeddedPath: '/admin/panels/argocd',
    url: process.env.NEXT_PUBLIC_ARGOCD_PANEL_URL || '/apps/releases',
  },
  {
    key: 'argocd-release',
    name: 'ArgoCD 发布看板',
    description: '发布记录、回滚趋势与发布状态统计',
    icon: <RocketOutlined style={{ color: '#2563eb' }} />,
    embeddedPath: '/admin/panels/argocd/releases',
    url: process.env.NEXT_PUBLIC_ARGOCD_RELEASE_DASHBOARD_URL || process.env.NEXT_PUBLIC_ARGOCD_PANEL_URL || '/apps/releases',
  },
  {
    key: 'prometheus',
    name: 'Prometheus',
    description: '监控指标与告警查询',
    icon: <AreaChartOutlined style={{ color: '#10b981' }} />,
    embeddedPath: '/admin/panels/prometheus',
    url: process.env.NEXT_PUBLIC_PROMETHEUS_PANEL_URL || '/resources/workloads/pods',
  },
  {
    key: 'istio',
    name: 'Istio',
    description: '服务网格流量与治理面板',
    icon: <ApartmentOutlined style={{ color: '#8b5cf6' }} />,
    embeddedPath: '/admin/panels/istio',
    url: process.env.NEXT_PUBLIC_ISTIO_PANEL_URL || '/resources/networking/services',
  },
  {
    key: 'falco',
    name: 'Falco',
    description: '运行时威胁检测与告警',
    icon: <SafetyOutlined style={{ color: '#dc2626' }} />,
    embeddedPath: '/admin/panels/falco',
    url: process.env.NEXT_PUBLIC_FALCO_PANEL_URL,
  },
  {
    key: 'trivy',
    name: 'Trivy Operator',
    description: '漏洞扫描与配置基线风险',
    icon: <SafetyOutlined style={{ color: '#ea580c' }} />,
    embeddedPath: '/admin/panels/trivy',
    url: process.env.NEXT_PUBLIC_TRIVY_OPERATOR_PANEL_URL,
  },
  {
    key: 'kyverno',
    name: 'Kyverno',
    description: '策略治理与合规报告',
    icon: <SafetyOutlined style={{ color: '#7c3aed' }} />,
    embeddedPath: '/admin/panels/kyverno',
    url: process.env.NEXT_PUBLIC_KYVERNO_PANEL_URL,
  },
  {
    key: 'gatekeeper',
    name: 'OPA Gatekeeper',
    description: '准入策略与约束审计',
    icon: <SafetyOutlined style={{ color: '#0f766e' }} />,
    embeddedPath: '/admin/panels/gatekeeper',
    url: process.env.NEXT_PUBLIC_GATEKEEPER_PANEL_URL,
  },
];

const resourceQuickLinks = [
  { key: 'pods', name: 'Pods', path: '/resources/workloads/pods' },
  { key: 'deployments', name: 'Deployments', path: '/resources/workloads/deployments' },
  { key: 'statefulsets', name: 'StatefulSets', path: '/resources/workloads/statefulsets' },
  { key: 'daemonsets', name: 'DaemonSets', path: '/resources/workloads/daemonsets' },
  { key: 'services', name: 'Services', path: '/resources/networking/services' },
  { key: 'releases', name: '发布记录', path: '/apps/releases' },
];

export default function DashboardPage() {
  const router = useRouter();

  const { data, loading } = useRequest<DashboardData | null, []>(
    async () => {
      const res = await request('/api/dashboard');
      if (!res.ok) return null;
      return res.json();
    },
    { pollingInterval: 30000 },
  );

  return (
    <Spin spinning={loading && !data}>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <StatCard
            title="集群"
            value={data?.clusterCount ?? '-'}
            gradient="linear-gradient(135deg, #326CE5, #1a4bc7)"
            icon={<ClusterOutlined />}
            onClick={() => router.push('/clusters')}
          />
        </Col>
        <Col span={6}>
          <StatCard
            title="运行 Pods"
            value={data?.podCount ?? '-'}
            gradient="linear-gradient(135deg, #10b981, #059669)"
            icon={<CloudOutlined />}
            onClick={() => router.push('/resources/workloads/pods')}
          />
        </Col>
        <Col span={6}>
          <StatCard
            title="Deployments"
            value={data?.deploymentCount ?? '-'}
            gradient="linear-gradient(135deg, #8b5cf6, #7c3aed)"
            icon={<RocketOutlined />}
            onClick={() => router.push('/resources/workloads/deployments')}
          />
        </Col>
        <Col span={6}>
          <StatCard
            title="今日发布"
            value={data?.todayReleaseCount ?? '-'}
            gradient="linear-gradient(135deg, #f59e0b, #d97706)"
            icon={<CalendarOutlined />}
            onClick={() => router.push('/apps/releases')}
          />
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={16}>
          <Card title="最近事件" style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <List
              dataSource={data?.events || []}
              locale={{ emptyText: data ? '暂无事件' : '加载中...' }}
              renderItem={(item: DashboardEvent) => (
                <List.Item>
                  <List.Item.Meta
                    title={(
                      <span>
                        <Tag color={eventTypeColor[item.type || ''] || 'default'} style={{ marginRight: 8 }}>
                          {item.type}
                        </Tag>
                        <Text strong>{item.object}</Text>
                        <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                          {item.namespace} · {item.cluster}
                        </Text>
                      </span>
                    )}
                    description={
                      <span>
                        <Text type="secondary">{item.reason}: </Text>
                        {item.message?.substring(0, 120)}
                      </span>
                    }
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {item.time}
                  </Text>
                </List.Item>
              )}
            />
          </Card>

          <Card title="快速入口" style={{ marginTop: 16, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <Space wrap>
              {resourceQuickLinks.map((link) => (
                <Button key={link.key} onClick={() => router.push(link.path)}>
                  {link.name}
                </Button>
              ))}
            </Space>
          </Card>
        </Col>

        <Col span={8}>
          <Card title="集群状态" style={{ marginBottom: 16, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <List
              dataSource={data?.clusters || []}
              locale={{ emptyText: data ? '暂无集群数据' : '加载中...' }}
              renderItem={(item: DashboardClusterStatus) => {
                const status = item.status || 'disconnected';
                return (
                  <List.Item>
                    <List.Item.Meta
                      avatar={statusIcon[status] || statusIcon.disconnected}
                      title={item.name}
                      description={
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Nodes: {item.nodes ?? 0} · Pods: {item.pods ?? 0}
                        </Text>
                      }
                    />
                    <Tag color={status === 'connected' ? 'green' : status === 'error' ? 'red' : 'default'}>
                      {status}
                    </Tag>
                  </List.Item>
                );
              }}
            />
          </Card>

          <Card title="平台面板" style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <List
              dataSource={panelLinks}
              renderItem={(panel) => (
                <List.Item
                  actions={[
                    <Button
                      key={`${panel.key}-embedded`}
                      type="link"
                      onClick={() => router.push(panel.embeddedPath)}
                    >
                      内嵌页
                    </Button>,
                    <Button
                      key={`${panel.key}-open`}
                      type="link"
                      onClick={() => panel.url && window.open(panel.url, '_blank', 'noopener,noreferrer')}
                    >
                      打开
                    </Button>,
                  ]}
                >
                  <List.Item.Meta avatar={panel.icon} title={panel.name} description={panel.description} />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </Spin>
  );
}