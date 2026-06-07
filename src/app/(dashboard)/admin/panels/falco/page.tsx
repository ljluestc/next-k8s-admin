'use client';

import ExternalPanelPage from '@/components/external-panel-page';

export default function FalcoPanelPage() {
  return (
    <ExternalPanelPage
      title="Falco"
      description="用于查看运行时安全事件与异常行为检测告警。"
      panelUrl={process.env.NEXT_PUBLIC_FALCO_PANEL_URL || '/admin/audit'}
      envVarName="NEXT_PUBLIC_FALCO_PANEL_URL"
    />
  );
}
