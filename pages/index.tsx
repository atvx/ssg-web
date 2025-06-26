import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import dynamic from 'next/dynamic';
import { Spin, Card, Typography, Space, Row, Col } from 'antd';
import { 
  DatabaseOutlined, 
  FileTextOutlined, 
  SyncOutlined,
  RightOutlined
} from '@ant-design/icons';

// 动态导入布局组件以提升性能
const Layout = dynamic(() => import('@/components/layout/Layout'), {
  ssr: true,
  loading: () => <div className="h-screen flex items-center justify-center"><Spin size="large" /></div>,
});

const { Title, Paragraph, Text } = Typography;

// 判断是否为移动设备的Hook
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // 初始检查
    checkIsMobile();
    
    // 监听窗口大小变化
    window.addEventListener('resize', checkIsMobile);
    
    // 清理函数
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);
  
  return isMobile;
};

const HomePage: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // 如果用户未登录，重定向到登录页
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Spin size="large" /></div>;
  }

  if (!isAuthenticated) {
    return null; // 等待重定向
  }

  // 快速操作项定义
  const quickActions = [
    {
      title: '查看详细销售数据',
      icon: <DatabaseOutlined />,
      path: '/sales/data',
      color: '#1890ff',
      description: '浏览所有销售记录和数据统计'
    },
    {
      title: '导出销售报表',
      icon: <FileTextOutlined />,
      path: '/sales/reports',
      color: '#52c41a',
      description: '生成并下载各类销售报表'
    },
    {
      title: '获取最新数据',
      icon: <SyncOutlined />,
      path: '/tasks',
      color: '#fa8c16',
      description: '同步最新销售数据和信息'
    }
  ];

  return (
    <Layout>
      <Head>
        <title>仪表板 | 销售助手</title>
        <meta name="description" content="销售助手仪表板" />
      </Head>

      <div className={`py-4 md:py-8 ${isMobile ? 'px-3' : 'px-8'}`}>
        {/* 欢迎区域 */}
        <Card 
          className="mb-6 shadow-md rounded-xl border-0" 
          style={{ 
            background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%)',
          }}
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>
                欢迎回来，{user?.username}
              </Title>
              <Paragraph className="text-gray-500 mt-2 mb-0">
                这是您的销售数据概览，可以快速访问常用功能。
              </Paragraph>
            </div>
            <div className="mt-4 md:mt-0">
              <img 
                src="/dashboard-illustration.svg" 
                alt="Dashboard" 
                className="h-24 md:h-32 w-auto" 
                onError={(e) => {
                  // 如果图片加载失败，隐藏图片元素
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>
        </Card>

        {/* 错误提示 */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {/* 快速操作区域 */}
        <div className="mb-8">
          <Title level={4} className="mb-4">快速操作</Title>
          <Row gutter={[16, 16]}>
            {quickActions.map((action, index) => (
              <Col xs={24} sm={24} md={8} key={index}>
                <Card 
                  hoverable
                  className="h-full shadow-sm transition-all duration-300 hover:shadow-md"
                  onClick={() => router.push(action.path)}
                  style={{ borderRadius: '12px', overflow: 'hidden', cursor: 'pointer' }}
                >
                  <div className="flex items-start">
                    <div 
                      className="flex items-center justify-center rounded-lg p-3 mr-4"
                      style={{ backgroundColor: `${action.color}15` }}
                    >
                      <span style={{ fontSize: '24px', color: action.color }}>
                        {action.icon}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <Title level={5} style={{ margin: 0 }}>{action.title}</Title>
                        <RightOutlined className="text-gray-400" />
                      </div>
                      <Paragraph className="text-gray-500 text-sm mt-1 mb-0">
                        {action.description}
                      </Paragraph>
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </div>
    </Layout>
  );
};

export default HomePage; 