import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { CalendarIcon, ArrowPathIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import SalesDataTable from '@/components/sales/SalesDataTable';
import SalesCharts from '@/components/sales/SalesCharts';
import { salesAPI } from '@/lib/api';
import { SalesData } from '@/types/api';
import { Spin, Tabs } from 'antd';
import type { TabsProps } from 'antd';

const SalesDataPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [platform, setPlatform] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('charts');

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

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const tabItems: TabsProps['items'] = [
    {
      key: 'charts',
      label: '数据图表',
      children: <SalesCharts className="mt-6" />
    },
    {
      key: 'table',
      label: '数据列表',
      children: <SalesDataTable className="mt-6" data={salesData} isLoading={isLoadingData} />
    }
  ];

  return (
    <Layout>
      <Head>
        <title>销售数据 | 销售助手</title>
        <meta name="description" content="查看销售数据" />
      </Head>

      <div className="py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">销售数据</h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          查看和筛选销售数据。
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <Tabs 
          activeKey={activeTab} 
          onChange={handleTabChange} 
          className="mb-6"
          items={tabItems}
        />
      </div>
    </Layout>
  );
};

export default SalesDataPage; 