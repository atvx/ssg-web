import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import SalesCharts from '@/components/sales/SalesCharts';
import { Spin } from 'antd';

const SalesChartsPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

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

  return (
    <Layout>
      <Head>
        <title>营业统计 | 销售助手</title>
        <meta name="description" content="查看销售图表数据" />
      </Head>

      <div className="py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">营业统计</h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          查看营业数据图表。
        </p>
      </div>

      <SalesCharts className="mt-6" />
    </Layout>
  );
};

export default SalesChartsPage; 