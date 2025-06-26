import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import { Spin, Typography } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

const { Title } = Typography;

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

const LoginPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { registered } = router.query;
  const [redirecting, setRedirecting] = useState(false);
  const isMobile = useIsMobile();

  // 如果用户已登录，重定向到仪表板
  useEffect(() => {
    let isMounted = true;

    const handleRedirect = async () => {
      if (isAuthenticated && !isLoading && !redirecting) {
        setRedirecting(true);
        // 使用setTimeout让状态有时间更新，避免立即卸载组件
        setTimeout(() => {
          if (isMounted) {
            router.push('/');
          }
        }, 0);
      }
    };

    handleRedirect();

    // 清理函数，防止组件卸载后更新状态
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, isLoading, router, redirecting]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
        <span className="ml-2 text-gray-600"><Spin size="small" /></span>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>登录 | 销售助手</title>
        <meta name="description" content="登录销售助手系统" />
      </Head>

      <div className="flex flex-col min-h-screen bg-gray-50">
        <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <Title level={isMobile ? 3 : 2} className="text-gray-800">销售助手系统</Title>
          </div>
          
          <div className="w-full max-w-md">
            {registered && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                注册成功，请登录
              </div>
            )}
            <LoginForm />
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage; 