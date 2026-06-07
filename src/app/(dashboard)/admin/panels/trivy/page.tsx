'use client';

import ExternalPanelPage from '@/components/external-panel-page';

export default function TrivyPanelPage() {
  return (
    <ExternalPanelPage
      title="Trivy"
      description="用于查看漏洞扫描结果与镜像/配置安全基线。"
      panelUrl={process.env.NEXT_PUBLIC_TRIVY_OPERATOR_PANEL_URL || '/apps/releases'}
      envVarName="NEXT_PUBLIC_TRIVY_OPERATOR_PANEL_URL"
    />
  );
}
