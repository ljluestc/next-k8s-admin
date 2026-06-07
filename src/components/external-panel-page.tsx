'use client';

import { Alert, Button, Card, Col, Row, Space, Typography } from 'antd';
import { LinkOutlined } from '@ant-design/icons';
interface RelatedPanelConfig {
  title: string;
  description: string;
  panelUrl?: string;
  envVarName: string;
  embeddedPath?: string;
}

interface ExternalPanelPageProps {
  title: string;
  description: string;
  panelUrl?: string;
  envVarName: string;
  relatedPanels?: RelatedPanelConfig[];
}

const { Title, Paragraph, Text } = Typography;

export default function ExternalPanelPage({
  title,
  description,
  panelUrl,
  envVarName,
  relatedPanels,
}: ExternalPanelPageProps) {
  const url = panelUrl?.trim() || '';

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <Title level={4} style={{ marginTop: 0, marginBottom: 8 }}>{title}</Title>
        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          {description}
        </Paragraph>

        {url ? (
          <Space direction="vertical" size={8}>
            <Button type="primary" icon={<LinkOutlined />} href={url} target="_blank" rel="noreferrer">
              打开 {title}
            </Button>
            <Text copyable={{ text: url }} style={{ color: '#64748b' }}>
              {url}
            </Text>
          </Space>
        ) : (
          <Alert
            type="warning"
            showIcon
            message="未配置面板地址"
            description={
              <span>
                请在部署环境中设置 <Text code>{envVarName}</Text>，然后重启应用。
              </span>
            }
          />
        )}
      </Card>

      {url && (
        <Card
          style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
          bodyStyle={{ padding: 0 }}
        >
          <iframe
            title={`${title} Panel`}
            src={url}
            style={{
              width: '100%',
              height: 'calc(100vh - 300px)',
              minHeight: 560,
              border: 0,
              borderRadius: 12,
            }}
          />
        </Card>
      )}

      {relatedPanels && relatedPanels.length > 0 && (
        <Card
          title="附加面板"
          style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
        >
          <Row gutter={[16, 16]}>
            {relatedPanels.map((panel) => {
              const relatedUrl = panel.panelUrl?.trim() || '';
              return (
                <Col xs={24} md={12} key={panel.title}>
                  <Card size="small" style={{ borderRadius: 10, height: '100%' }}>
                    <Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>{panel.title}</Title>
                    <Paragraph type="secondary" style={{ marginBottom: 12 }}>
                      {panel.description}
                    </Paragraph>
                    {relatedUrl ? (
                      <Space wrap>
                        <Button icon={<LinkOutlined />} href={relatedUrl} target="_blank" rel="noreferrer">
                          打开 {panel.title}
                        </Button>
                        {panel.embeddedPath && (
                          <Button href={panel.embeddedPath}>
                            系统内嵌查看
                          </Button>
                        )}
                      </Space>
                    ) : (
                      <Alert
                        type="warning"
                        showIcon
                        message="未配置面板地址"
                        description={<span>请设置 <Text code>{panel.envVarName}</Text></span>}
                      />
                    )}
                  </Card>
                </Col>
              );
            })}
          </Row>
        </Card>
      )}
    </div>
  );
}
