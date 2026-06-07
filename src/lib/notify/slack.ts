interface ReleaseInfo {
  releaseName: string;
  clusterName: string;
  namespace: string;
  templateName?: string;
  image?: string;
  revision: number;
  status: string;
  message: string;
  operator: string;
  time: string;
}

function statusEmoji(status: string): string {
  switch (status) {
    case 'applied': return '✅';
    case 'failed': return '❌';
    case 'rolled_back': return '⏪';
    default: return '🔄';
  }
}

function statusText(status: string): string {
  switch (status) {
    case 'applied': return '发布成功';
    case 'failed': return '发布失败';
    case 'rolled_back': return '已回滚';
    case 'pending': return '发布中';
    default: return status;
  }
}

export async function sendSlackNotification(webhookUrl: string, info: ReleaseInfo) {
  const payload = {
    text: `${statusEmoji(info.status)} 发布通知 · ${info.clusterName}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${statusEmoji(info.status)} 发布通知 · ${info.clusterName}`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*应用名称*\n${info.releaseName}` },
          { type: 'mrkdwn', text: `*状态*\n${statusEmoji(info.status)} ${statusText(info.status)}` },
          { type: 'mrkdwn', text: `*集群*\n${info.clusterName}` },
          { type: 'mrkdwn', text: `*命名空间*\n${info.namespace}` },
          { type: 'mrkdwn', text: `*镜像版本*\n${info.image || '-'}` },
          { type: 'mrkdwn', text: `*操作人*\n${info.operator}` },
        ],
      },
      ...(info.templateName ? [{
        type: 'section',
        text: { type: 'mrkdwn', text: `*模板*: ${info.templateName}` },
      }] : []),
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*变更说明*\n${info.message || '无'}` },
      },
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `K8s Admin · ${info.time}` }],
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error('Slack notification failed:', await res.text());
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Slack notification error:', message);
  }
}
