'use client';

import ExternalPanelPage from '@/components/external-panel-page';

export default function KyvernoPanelPage() {
  return (
    <ExternalPanelPage
      title="Kyverno"
      description="用于查看策略合规、准入控制与策略执行结果。"
      panelUrl={process.env.NEXT_PUBLIC_KYVERNO_PANEL_URL || '/resources/namespaces'}
      envVarName="NEXT_PUBLIC_KYVERNO_PANEL_URL"
    />
  );
}
