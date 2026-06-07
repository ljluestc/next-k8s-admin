'use client';

import { Card, Empty, Progress, Space, Tag, Typography } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

export interface KeyDeploymentStatus {
  name: string;
  ready: boolean;
  readyReplicas: number;
  replicas: number;
}

export interface PlatformPanelData {
  namespace: string;
  installed: boolean;
  deploymentCount: number;
  readyDeploymentCount: number;
  podCount: number;
  runningPodCount: number;
  serviceCount: number;
  keyDeployments: KeyDeploymentStatus[];
}

interface PlatformPanelCardProps {
  title: string;
  data?: PlatformPanelData;
  extra?: React.ReactNode;
}

function getPanelHealth(data: PlatformPanelData) {
  if (!data.installed) return { color: 'default', label: '未安装', icon: <MinusCircleOutlined /> };

  const deploymentHealthy = data.deploymentCount === 0 || data.readyDeploymentCount === data.deploymentCount;
  const podHealthy = data.podCount === 0 || data.runningPodCount === data.podCount;

  if (deploymentHealthy && podHealthy) {
    return { color: 'green', label: '健康', icon: <CheckCircleOutlined /> };
  }

  return { color: 'orange', label: '降级', icon: <ExclamationCircleOutlined /> };
}

export default function PlatformPanelCard({ title, data, extra }: PlatformPanelCardProps) {
  if (!data) {
    return <Card title={title} loading style={{ borderRadius: 12, height: '100%' }} />;
  }

  const health = getPanelHealth(data);
  const deploymentPercent = data.deploymentCount > 0
    ? Math.round((data.readyDeploymentCount / data.deploymentCount) * 100)
    : 0;
  const podPercent = data.podCount > 0
    ? Math.round((data.runningPodCount / data.podCount) * 100)
    : 0;

  return (
    <Card title={title} style={{ borderRadius: 12, height: '100%' }} extra={extra}>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Space wrap>
          <Tag color={health.color} icon={health.icon}>{health.label}</Tag>
          <Tag>NS: {data.namespace}</Tag>
        </Space>

        {!data.installed ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`命名空间 ${data.namespace} 暂未发现组件`} />
        ) : (
          <>
            <div>
              <Text type="secondary">Deployments 就绪</Text>
              <Text strong style={{ marginLeft: 8 }}>{data.readyDeploymentCount}/{data.deploymentCount}</Text>
              <Progress percent={deploymentPercent} size="small" showInfo={false} style={{ marginTop: 6, marginBottom: 0 }} />
            </div>

            <div>
              <Text type="secondary">Pods 运行</Text>
              <Text strong style={{ marginLeft: 8 }}>{data.runningPodCount}/{data.podCount}</Text>
              <Progress percent={podPercent} size="small" showInfo={false} style={{ marginTop: 6, marginBottom: 0 }} />
            </div>

            <Text type="secondary">Services: {data.serviceCount}</Text>

            <div>
              <Text type="secondary">关键组件</Text>
              <div style={{ marginTop: 8 }}>
                {data.keyDeployments.length > 0 ? (
                  data.keyDeployments.map((item) => (
                    <Tag key={item.name} color={item.ready ? 'success' : 'warning'} style={{ marginBottom: 6 }}>
                      {item.name} {item.readyReplicas}/{item.replicas}
                    </Tag>
                  ))
                ) : (
                  <Text type="secondary">未识别到关键 Deployment</Text>
                )}
              </div>
            </div>
          </>
        )}
      </Space>
    </Card>
  );
}
