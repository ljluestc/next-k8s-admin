'use client';

import { useState } from 'react';
import { Tag, Button, Space, App, Card, List } from 'antd';
import {
  DeploymentUnitOutlined,
  AreaChartOutlined,
  ApartmentOutlined,
  DashboardOutlined,
  SecurityScanOutlined,
  AlertOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import ResourceTable from '@/components/resource-table';
import NamespaceSelector from '@/components/namespace-selector';
import ResourceDrawer from '@/components/resource-drawer';
import DeleteConfirm from '@/components/delete-confirm';
import { useK8sResource } from '@/hooks/use-k8s-resource';
import { usePermissions } from '@/hooks/use-permissions';
import { useClusterStore } from '@/hooks/use-cluster';
import PageContainer from '@/components/page-container';
import { gradientBtnStyle } from '@/lib/styles';
import { isSystemResource } from '@/lib/k8s-helpers';
import { request } from '@/lib/request';
interface ServiceRecord {
  metadata?: {
    name?: string;
    namespace?: string;
    creationTimestamp?: string;
  };
  spec?: {
    type?: string;
    clusterIP?: string;
    ports?: Array<{
      port?: number | string;
      protocol?: string;
    }>;
  };
}

interface DrawerState {
  open: boolean;
  mode: 'view' | 'edit' | 'create';
  record?: ServiceRecord;
}
const panelLinks = [
  {
    key: 'dashboard',
    name: 'Dashboard',
    description: '外部运维总览看板入口',
    icon: <DashboardOutlined style={{ color: '#f59e0b' }} />,
    url: process.env.NEXT_PUBLIC_DASHBOARD_PANEL_URL || '/',
  },
  {
    key: 'argocd',
    name: 'ArgoCD',
    description: '应用持续交付与发布管理',
    icon: <DeploymentUnitOutlined style={{ color: '#326CE5' }} />,
    url: process.env.NEXT_PUBLIC_ARGOCD_PANEL_URL || '/apps/releases',
  },
  {
    key: 'prometheus',
    name: 'Prometheus',
    description: '监控指标与告警查询',
    icon: <AreaChartOutlined style={{ color: '#10b981' }} />,
    url: process.env.NEXT_PUBLIC_PROMETHEUS_PANEL_URL || '/resources/workloads/pods',
  },
  {
    key: 'istio',
    name: 'Istio',
    description: '服务网格流量与治理面板',
    icon: <ApartmentOutlined style={{ color: '#8b5cf6' }} />,
    url: process.env.NEXT_PUBLIC_ISTIO_PANEL_URL || '/resources/networking/services',
  },
  {
    key: 'trivy',
    name: 'Trivy',
    description: 'CNCF 漏洞扫描与镜像/配置安全面板',
    icon: <SecurityScanOutlined style={{ color: '#0ea5e9' }} />,
    url: process.env.NEXT_PUBLIC_TRIVY_OPERATOR_PANEL_URL || '/admin/panels/trivy',
  },
  {
    key: 'falco',
    name: 'Falco',
    description: 'CNCF 运行时安全检测与告警面板',
    icon: <AlertOutlined style={{ color: '#ef4444' }} />,
    url: process.env.NEXT_PUBLIC_FALCO_PANEL_URL || '/admin/panels/falco',
  },
  {
    key: 'kyverno',
    name: 'Kyverno',
    description: 'CNCF 策略与合规治理面板',
    icon: <SafetyCertificateOutlined style={{ color: '#22c55e' }} />,
    url: process.env.NEXT_PUBLIC_KYVERNO_PANEL_URL || '/admin/panels/kyverno',
  },
];

export default function ServicesPage() {
  const { message } = App.useApp();
  const [namespace, setNamespace] = useState<string | undefined>();
  const { data = [], loading, refresh } = useK8sResource('services', namespace);
  const permissions = usePermissions('services');
  const { clusterId } = useClusterStore();
  const [drawerState, setDrawerState] = useState<DrawerState>({ open: false, mode: 'view' });

  const handleDelete = async (record: ServiceRecord) => {
    const name = record.metadata?.name;
    const ns = record.metadata?.namespace;
    if (!clusterId || !name || !ns) return;
    const res = await request(`/api/k8s/${clusterId}/namespaces/${ns}/services/${name}`, { method: 'DELETE' });
    if (res.ok) { message.success(`Service ${name} 已删除`); refresh(); }
    else { const d = await res.json().catch(() => ({})); message.error(d.error || '删除失败'); }
  };

  const handleNsChange = (v: string | undefined) => {
    setNamespace(v);
    setDrawerState(s => ({ ...s, open: false }));
  };

  const columns = [
    {
      title: '名称', dataIndex: ['metadata', 'name'], key: 'name',
      render: (text: string, record: ServiceRecord) => (
        <a onClick={() => setDrawerState({ open: true, mode: 'view', record })}>{text}</a>
      ),
    },
    { title: '命名空间', dataIndex: ['metadata', 'namespace'], key: 'namespace' },
    {
      title: '类型',
      key: 'type',
      render: (_: unknown, r: ServiceRecord) => {
        const type = r.spec?.type || 'ClusterIP';
        const colors: Record<string, string> = {
          ClusterIP: 'blue', NodePort: 'orange', LoadBalancer: 'green', ExternalName: 'purple',
        };
        return <Tag color={colors[type] || 'default'}>{type}</Tag>;
      },
    },
    {
      title: 'Cluster IP',
      dataIndex: ['spec', 'clusterIP'],
      key: 'clusterIP',
      render: (v: string) => v || '-',
    },
    {
      title: '端口',
      key: 'ports',
      render: (_: unknown, r: ServiceRecord) => {
        const ports = r.spec?.ports || [];
        return ports.map((p) => `${p.port}/${p.protocol}`).join(', ') || '-';
      },
    },
    {
      title: '创建时间',
      dataIndex: ['metadata', 'creationTimestamp'],
      key: 'created',
      render: (t: string) => new Date(t).toLocaleString(),
    },
    {
      title: '操作', key: 'actions', width: 150, fixed: 'right' as const,
      render: (_: unknown, record: ServiceRecord) => {
        const system = isSystemResource(record);
        return (
          <Space>
            {permissions.canUpdate && !system && (
              <Button size="small" type="link" onClick={() => setDrawerState({ open: true, mode: 'edit', record })}>编辑</Button>
            )}
            {permissions.canDelete && !system && (
              <DeleteConfirm name={record.metadata?.name || '-'} kindLabel="Service" onConfirm={() => handleDelete(record)} />
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <PageContainer
        title="Services"
        extra={(
          <Space>
            <Button href="/">Dashboard</Button>
            <Button href="/admin/panels">运维面板</Button>
            {permissions.canCreate && (
              <Button type="primary" onClick={() => setDrawerState({ open: true, mode: 'create' })} style={gradientBtnStyle}>
                + 创建
              </Button>
            )}
          </Space>
        )}
        filters={<NamespaceSelector value={namespace} onChange={handleNsChange} />}
      >
        <ResourceTable data={data} loading={loading} columns={columns} />
      </PageContainer>
      <Card
        title="运维面板"
        style={{ marginTop: 16, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
      >
        <List
          dataSource={panelLinks}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button
                  key={item.key}
                  type="primary"
                  ghost
                  size="small"
                  onClick={() => item.url && window.open(item.url, '_blank', 'noopener,noreferrer')}
                >
                  打开
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={item.icon}
                title={item.name}
                description={item.description}
              />
            </List.Item>
          )}
        />
      </Card>
      <ResourceDrawer
        open={drawerState.open}
        mode={drawerState.mode}
        kind="services"
        kindLabel="Service"
        record={drawerState.record}
        namespace={namespace}
        permissions={permissions}
        onClose={() => setDrawerState({ open: false, mode: 'view' })}
        onSuccess={() => { setDrawerState({ open: false, mode: 'view' }); refresh(); }}
      />
    </>
  );
}
