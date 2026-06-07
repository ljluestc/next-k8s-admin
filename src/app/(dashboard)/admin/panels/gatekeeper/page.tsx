'use client';

import ExternalPanelPage from '@/components/external-panel-page';

export default function GatekeeperPanelPage() {
  return (
    <ExternalPanelPage
      title="Gatekeeper"
      description="用于查看 OPA Gatekeeper 准入策略、约束模板与审计状态。"
      panelUrl={process.env.NEXT_PUBLIC_GATEKEEPER_PANEL_URL || '/admin/audit'}
      envVarName="NEXT_PUBLIC_GATEKEEPER_PANEL_URL"
    />
  );
}
