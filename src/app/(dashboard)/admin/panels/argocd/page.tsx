'use client';

import ExternalPanelPage from '@/components/external-panel-page';

export default function ArgoCdPanelPage() {
  const argocdPanelUrl = process.env.NEXT_PUBLIC_ARGOCD_PANEL_URL;
  const releaseDashboardUrl = process.env.NEXT_PUBLIC_ARGOCD_RELEASE_DASHBOARD_URL || argocdPanelUrl || '/apps/releases';
  return (
    <ExternalPanelPage
      title="Argo CD"
      description="用于查看应用同步状态、健康检查与发布历史。"
      panelUrl={argocdPanelUrl}
      envVarName="NEXT_PUBLIC_ARGOCD_PANEL_URL"
      relatedPanels={[
        {
          title: 'Release Dashboard',
          description: '查看 ArgoCD 发布记录、回滚历史与状态统计。',
          panelUrl: releaseDashboardUrl,
          envVarName: 'NEXT_PUBLIC_ARGOCD_RELEASE_DASHBOARD_URL',
          embeddedPath: '/apps/releases',
        },
      ]}
    />
  );
}
