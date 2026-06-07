'use client';

import ExternalPanelPage from '@/components/external-panel-page';

export default function PrometheusPanelPage() {
  return (
    <ExternalPanelPage
      title="Prometheus"
      description="用于查看集群与应用监控指标、执行 PromQL 查询。"
      panelUrl={process.env.NEXT_PUBLIC_PROMETHEUS_PANEL_URL || '/resources/workloads/pods'}
      envVarName="NEXT_PUBLIC_PROMETHEUS_PANEL_URL"
    />
  );
}
