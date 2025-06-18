import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { CalendarIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import SalesDataTable from '@/components/sales/SalesDataTable';
import { salesAPI } from '@/lib/api';
import { SalesData } from '@/types/api';

const SalesDataPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [platform, setPlatform] = useState<string>('');

  // 如果用户未登录，重定向到登录页
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // 获取销售数据
  const fetchData = async () => {
    if (isAuthenticated) {
      try {
        setIsLoadingData(true);
        setError(null);
        const response = await salesAPI.fetchData({ 
          date, 
          platform: platform || undefined,
          sync: true 
        });
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

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">加载中...</div>;
  }

  if (!isAuthenticated) {
    return null; // 等待重定向
  }

  return (
    <Layout>
      <Head>
        <title>销售数据 | 销售助手</title>
        <meta name="description" content="查看销售数据" />
      </Head>

      <div className="py-6">
        <h1 className="text-2xl font-semibold text-gray-900">销售数据</h1>
        <p className="mt-1 text-sm text-gray-500">
          查看和筛选销售数据。
        </p>

        {/* 筛选器 */}
        <div className="mt-6 bg-white p-4 rounded-md shadow">
          <div className="flex flex-wrap gap-4">
            <div>
              <label htmlFor="date" className="form-label flex items-center">
                <CalendarIcon className="h-5 w-5 mr-1 text-gray-400" />
                日期
              </label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="form-input mt-1"
              />
            </div>
            <div>
              <label htmlFor="platform" className="form-label">平台</label>
              <select
                id="platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="form-input mt-1"
              >
                <option value="">全部平台</option>
                <option value="taobao">淘宝</option>
                <option value="jd">京东</option>
                <option value="pdd">拼多多</option>
                <option value="douyin">抖音</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchData}
                className="btn btn-primary flex items-center"
                disabled={isLoadingData}
              >
                <ArrowPathIcon className="h-5 w-5 mr-1" />
                {isLoadingData ? '加载中...' : '刷新数据'}
              </button>
            </div>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* 数据统计 */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2">
          <div className="card px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">总销售额</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      {isLoadingData ? '加载中...' : salesData ? `¥${salesData.amount.toLocaleString()}` : '暂无数据'}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="card px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">总订单数</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      {isLoadingData ? '加载中...' : salesData ? salesData.count : '暂无数据'}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* 销售数据表格 */}
        <div className="mt-6 bg-white shadow overflow-hidden rounded-md">
          <SalesDataTable data={salesData} isLoading={isLoadingData} />
        </div>
      </div>
    </Layout>
  );
};

export default SalesDataPage; 