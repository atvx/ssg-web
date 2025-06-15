import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { PlusIcon, PencilIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { salesAPI, orgsAPI } from '@/lib/api';
import { MonthlySalesTarget, OrgListItem } from '@/types/api';

const SalesTargetsPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [targets, setTargets] = useState<MonthlySalesTarget[]>([]);
  const [orgs, setOrgs] = useState<OrgListItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 如果用户未登录，重定向到登录页
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // 获取机构列表
  useEffect(() => {
    const fetchOrgs = async () => {
      if (isAuthenticated) {
        try {
          const response = await orgsAPI.getOrgs();
          if (response.data.success && response.data.data) {
            setOrgs(response.data.data as OrgListItem[]);
          }
        } catch (err) {
          setError('获取机构列表失败');
        }
      }
    };

    fetchOrgs();
  }, [isAuthenticated]);

  // 获取销售目标列表
  const fetchTargets = async () => {
    if (isAuthenticated) {
      try {
        setIsLoadingData(true);
        const params: any = { year, month };
        if (selectedOrgId) {
          params.org_id = selectedOrgId;
        }
        
        const response = await salesAPI.getSalesTargets(params);
        if (response.data.success && response.data.data) {
          setTargets(response.data.data as MonthlySalesTarget[]);
          setError(null);
        } else {
          setError('获取销售目标失败');
        }
      } catch (err) {
        setError('获取销售目标失败，请稍后再试');
      } finally {
        setIsLoadingData(false);
        setIsRefreshing(false);
      }
    }
  };

  // 监听筛选条件变化，重新获取数据
  useEffect(() => {
    fetchTargets();
  }, [isAuthenticated, year, month, selectedOrgId]);

  // 刷新数据
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchTargets();
  };

  // 获取机构名称
  const getOrgName = (orgId: string) => {
    const org = orgs.find(org => org.org_id === orgId);
    return org ? org.org_name : orgId;
  };

  // 删除销售目标
  const handleDelete = async (targetId: number) => {
    if (!window.confirm('确定要删除此销售目标吗？')) {
      return;
    }

    try {
      const response = await salesAPI.deleteSalesTarget(targetId);
      if (response.data.success) {
        // 从列表中移除已删除的目标
        setTargets(targets.filter(target => target.id !== targetId));
      } else {
        setError('删除销售目标失败');
      }
    } catch (err) {
      setError('删除销售目标失败，请稍后再试');
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
        <title>销售目标管理 | 销售助手</title>
        <meta name="description" content="管理销售目标" />
      </Head>

      <div className="py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">销售目标管理</h1>
          <button
            onClick={() => router.push('/sales/targets/new')}
            className="btn btn-primary"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            新增目标
          </button>
        </div>

        {/* 筛选器 */}
        <div className="mt-4 bg-white p-4 rounded-md shadow">
          <div className="flex flex-wrap gap-4">
            <div>
              <label htmlFor="year" className="form-label">年份</label>
              <select
                id="year"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="form-input mt-1"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="month" className="form-label">月份</label>
              <select
                id="month"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="form-input mt-1"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{m}月</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="org_id" className="form-label">机构</label>
              <select
                id="org_id"
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="form-input mt-1"
              >
                <option value="">全部机构</option>
                {orgs.map(org => (
                  <option key={org.org_id} value={org.org_id}>
                    {org.org_name || org.org_id}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="btn btn-outline h-10"
              >
                <ArrowPathIcon className={`h-5 w-5 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                刷新
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

        {/* 销售目标列表 */}
        <div className="mt-6 bg-white shadow overflow-hidden rounded-md">
          {isLoadingData ? (
            <div className="p-4 text-center">加载中...</div>
          ) : targets.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      机构
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      年月
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      目标金额
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      创建时间
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {targets.map((target) => (
                    <tr key={target.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getOrgName(target.org_id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {target.year}年{target.month}月
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ¥{target.target_income.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {target.created_at ? format(new Date(target.created_at), 'yyyy-MM-dd') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => router.push(`/sales/targets/edit/${target.id}`)}
                          className="text-primary-600 hover:text-primary-900 mr-4"
                          title="编辑"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => target.id && handleDelete(target.id)}
                          className="text-red-600 hover:text-red-900"
                          title="删除"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p className="mb-4">暂无销售目标数据</p>
              <button
                onClick={() => router.push('/sales/targets/new')}
                className="btn btn-outline"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                添加销售目标
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default SalesTargetsPage; 