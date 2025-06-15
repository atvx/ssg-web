import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { ChartBarIcon, CurrencyYenIcon, ClockIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { salesAPI } from '@/lib/api';
import { SalesData } from '@/types/api';

const DashboardPage: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const today = format(new Date(), 'yyyy-MM-dd');

  // 如果用户未登录，重定向到登录页
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // 获取销售数据
  useEffect(() => {
    const fetchData = async () => {
      if (isAuthenticated) {
        try {
          setIsLoadingData(true);
          const response = await salesAPI.fetchData({ date: today, sync: true });
          if (response.data.success && response.data.data) {
            setSalesData(response.data.data as SalesData);
          } else {
            setError('获取数据失败');
          }
        } catch (err) {
          setError('获取数据失败，请稍后再试');
        } finally {
          setIsLoadingData(false);
        }
      }
    };

    fetchData();
  }, [isAuthenticated, today]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">加载中...</div>;
  }

  if (!isAuthenticated) {
    return null; // 等待重定向
  }

  return (
    <Layout>
      <Head>
        <title>仪表板 | 销售助手</title>
        <meta name="description" content="销售助手仪表板" />
      </Head>

      <div className="py-6">
        <h1 className="text-2xl font-semibold text-gray-900">仪表板</h1>
        <p className="mt-1 text-sm text-gray-500">
          欢迎回来，{user?.username}。这是您的销售数据概览。
        </p>

        {/* 统计卡片 */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* 今日销售额 */}
          <div className="card px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                <CurrencyYenIcon className="h-6 w-6 text-primary-600" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">今日销售额</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      {isLoadingData ? '加载中...' : salesData ? `¥${salesData.amount.toLocaleString()}` : '暂无数据'}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          {/* 今日订单数 */}
          <div className="card px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-secondary-100 rounded-md p-3">
                <ChartBarIcon className="h-6 w-6 text-secondary-600" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">今日订单数</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      {isLoadingData ? '加载中...' : salesData ? salesData.count : '暂无数据'}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          {/* 最近同步时间 */}
          <div className="card px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                <ClockIcon className="h-6 w-6 text-green-600" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">最近同步时间</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      {format(new Date(), 'yyyy-MM-dd HH:mm:ss')}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* 快速操作按钮 */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900">快速操作</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              onClick={() => router.push('/sales/data')}
              className="btn btn-outline w-full justify-center"
            >
              查看详细销售数据
            </button>
            <button
              onClick={() => router.push('/sales/reports')}
              className="btn btn-outline w-full justify-center"
            >
              导出销售报表
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage; 