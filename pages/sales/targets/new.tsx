import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { salesAPI, orgsAPI } from '@/lib/api';
import { OrgListItem } from '@/types/api';

const NewTargetPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [orgs, setOrgs] = useState<OrgListItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 表单状态
  const [formData, setFormData] = useState({
    org_id: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    target_income: '',
    sort: 0
  });

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
            const orgsList = response.data.data as OrgListItem[];
            setOrgs(orgsList);
            // 如果有机构数据，默认选择第一个
            if (orgsList.length > 0) {
              setFormData(prev => ({ ...prev, org_id: orgsList[0].org_id }));
            }
          }
        } catch (err) {
          setError('获取机构列表失败');
        }
      }
    };

    fetchOrgs();
  }, [isAuthenticated]);

  // 处理表单输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'target_income' ? value : value }));
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证表单
    if (!formData.org_id) {
      setError('请选择机构');
      return;
    }
    
    if (!formData.target_income || parseFloat(formData.target_income.toString()) <= 0) {
      setError('请输入有效的目标金额');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await salesAPI.createSalesTarget({
        ...formData,
        target_income: parseFloat(formData.target_income.toString())
      });
      
      if (response.data.success) {
        // 创建成功，返回列表页
        router.push('/sales/targets');
      } else {
        setError(response.data.message || '创建销售目标失败');
      }
    } catch (err) {
      setError('创建销售目标失败，请稍后再试');
    } finally {
      setIsSubmitting(false);
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
        <title>新增销售目标 | 销售助手</title>
        <meta name="description" content="新增销售目标" />
      </Head>

      <div className="py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">新增销售目标</h1>
          <button
            onClick={() => router.back()}
            className="btn btn-outline"
          >
            返回
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* 表单 */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* 机构 */}
              <div>
                <label htmlFor="org_id" className="form-label">机构 <span className="text-red-500">*</span></label>
                <select
                  id="org_id"
                  name="org_id"
                  value={formData.org_id}
                  onChange={handleInputChange}
                  className="form-input mt-1"
                  required
                >
                  {orgs.length === 0 && <option value="">加载中...</option>}
                  {orgs.map(org => (
                    <option key={org.org_id} value={org.org_id}>
                      {org.org_name || org.org_id}
                    </option>
                  ))}
                </select>
              </div>

              {/* 年份 */}
              <div>
                <label htmlFor="year" className="form-label">年份 <span className="text-red-500">*</span></label>
                <select
                  id="year"
                  name="year"
                  value={formData.year}
                  onChange={handleInputChange}
                  className="form-input mt-1"
                  required
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* 月份 */}
              <div>
                <label htmlFor="month" className="form-label">月份 <span className="text-red-500">*</span></label>
                <select
                  id="month"
                  name="month"
                  value={formData.month}
                  onChange={handleInputChange}
                  className="form-input mt-1"
                  required
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{m}月</option>
                  ))}
                </select>
              </div>

              {/* 目标金额 */}
              <div>
                <label htmlFor="target_income" className="form-label">目标金额 <span className="text-red-500">*</span></label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">¥</span>
                  </div>
                  <input
                    type="number"
                    id="target_income"
                    name="target_income"
                    value={formData.target_income}
                    onChange={handleInputChange}
                    className="form-input pl-7 block w-full"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              {/* 排序 */}
              <div>
                <label htmlFor="sort" className="form-label">排序</label>
                <input
                  type="number"
                  id="sort"
                  name="sort"
                  value={formData.sort}
                  onChange={handleInputChange}
                  className="form-input mt-1"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => router.back()}
                className="btn btn-outline mr-3"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
              >
                {isSubmitting ? '提交中...' : '保存'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default NewTargetPage; 