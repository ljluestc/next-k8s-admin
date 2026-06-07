'use client';

import ExternalPanelPage from '@/components/external-panel-page';

export default function DashboardPanelPage() {
  return (
    <ExternalPanelPage
      title="Dashboard"
      description="用于展示外部运维看板（例如 Grafana 或业务总览大盘）。"
      panelUrl={process.env.NEXT_PUBLIC_DASHBOARD_PANEL_URL || '/'}
      envVarName="NEXT_PUBLIC_DASHBOARD_PANEL_URL"
    />
  );
}
