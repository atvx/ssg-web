import React, { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import { Spin, Typography } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

const { Title } = Typography;

const LoginPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { registered } = router.query;

  // 如果用户已登录，重定向到仪表板
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

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
            <Title level={2} className="text-gray-800">销售助手系统</Title>
          </div>
          
          <div className="w-full max-w-md">
            {registered && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
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