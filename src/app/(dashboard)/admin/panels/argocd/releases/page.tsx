'use client';

import ExternalPanelPage from '@/components/external-panel-page';

export default function ArgoCdReleaseDashboardPage() {
  return (
    <ExternalPanelPage
      title="Argo CD 发布看板"
      description="用于查看应用发布趋势、发布明细与回滚状态。"
      panelUrl={process.env.NEXT_PUBLIC_ARGOCD_RELEASE_DASHBOARD_URL || process.env.NEXT_PUBLIC_ARGOCD_PANEL_URL || '/apps/releases'}
      envVarName="NEXT_PUBLIC_ARGOCD_RELEASE_DASHBOARD_URL"
    />
  );
}
