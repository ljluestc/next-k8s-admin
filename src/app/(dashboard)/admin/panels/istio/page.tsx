'use client';

import ExternalPanelPage from '@/components/external-panel-page';

export default function IstioPanelPage() {
  return (
    <ExternalPanelPage
      title="Istio"
      description="用于查看服务网格流量、配置与网关相关状态。"
      panelUrl={process.env.NEXT_PUBLIC_ISTIO_PANEL_URL || '/resources/networking/services'}
      envVarName="NEXT_PUBLIC_ISTIO_PANEL_URL"
      relatedPanels={[
        {
          title: 'Dashboard',
          description: '查看全局运维与业务看板。',
          panelUrl: process.env.NEXT_PUBLIC_DASHBOARD_PANEL_URL || '/',
          envVarName: 'NEXT_PUBLIC_DASHBOARD_PANEL_URL',
          embeddedPath: '/admin/panels/dashboard',
        },
        {
          title: 'Argo CD',
          description: '查看应用同步、健康状态与发布进度。',
          panelUrl: process.env.NEXT_PUBLIC_ARGOCD_PANEL_URL || '/apps/releases',
          envVarName: 'NEXT_PUBLIC_ARGOCD_PANEL_URL',
          embeddedPath: '/admin/panels/argocd',
        },
        {
          title: 'Prometheus',
          description: '查看监控指标与告警趋势。',
          panelUrl: process.env.NEXT_PUBLIC_PROMETHEUS_PANEL_URL || '/resources/workloads/pods',
          envVarName: 'NEXT_PUBLIC_PROMETHEUS_PANEL_URL',
          embeddedPath: '/admin/panels/prometheus',
        },
      ]}
    />
  );
}
