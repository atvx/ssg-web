import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { PlusIcon, PencilIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Select, DatePicker, ConfigProvider, Table, Progress, Pagination, Spin } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { salesAPI, orgsAPI } from '@/lib/api';
import { MonthlySalesTarget, OrgListItem } from '@/types/api';

// 设置 dayjs 为中文
dayjs.locale('zh-cn');

const { Option, OptGroup } = Select;

// 扩展 MonthlySalesTarget 类型以匹配后端返回的数据
interface EnhancedMonthlySalesTarget extends MonthlySalesTarget {
  org_name?: string;
  car_count?: number;
  actual_income?: number;
  ach_rate?: number;
  sold_car_count?: number;
  per_car_income?: number;
}

const SalesTargetsPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [targets, setTargets] = useState<EnhancedMonthlySalesTarget[]>([]);
  const [orgs, setOrgs] = useState<OrgListItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  // 如果用户未登录，重定向到登录页
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // 获取机构列表
  useEffect(() => {
    const fetchOrgs = async () => {
      if (isAuthenticated) {
        try {
          const response = await orgsAPI.getOrgs({ type: '2,3' });
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

  // 刷新数据
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  // 安全的数据加载函数
  const loadData = async () => {
    if (!isAuthenticated) return;
    
    try {
      setIsLoadingData(true);
      const params: any = { year, month, skip: (currentPage - 1) * pageSize, limit: pageSize };
      if (selectedOrgId) {
        params.org_id = selectedOrgId;
      }
      const response = await salesAPI.getSalesTargets(params);

      if (response.data.success && response.data.data) {
        setTargets(response.data.data.items || response.data.data);
        setTotal(response.data.data.total || (response.data.data.length || 0));
        setError(null);
      } else {
        setError('获取月目标失败');
      }
    } catch (err) {
      setError('获取月目标失败，请稍后再试');
    } finally {
      setIsLoadingData(false);
      setIsRefreshing(false);
    }
  };

  // 监听筛选条件和分页变化，重新获取数据
  useEffect(() => {
    let isMounted = true;

    const effectLoadData = async () => {
      if (!isMounted) return;
      try {
        setIsLoadingData(true);
        const params: any = { year, month, skip: (currentPage - 1) * pageSize, limit: pageSize };
        if (selectedOrgId) {
          params.org_id = selectedOrgId;
        }
        const response = await salesAPI.getSalesTargets(params);
        if (!isMounted) return; // 再次检查是否已卸载

        if (response.data.success && response.data.data) {
          setTargets(response.data.data.items || response.data.data);
          setTotal(response.data.data.total || (response.data.data.length || 0));
          setError(null);
        } else {
          setError('获取月目标失败');
        }
      } catch (err) {
        if (!isMounted) return;
        setError('获取月目标失败，请稍后再试');
      } finally {
        if (isMounted) {
          setIsLoadingData(false);
          setIsRefreshing(false);
        }
      }
    };

    effectLoadData();

    // 返回清理函数
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, year, month, selectedOrgId, currentPage, pageSize]);

  // 获取机构名称
  const getOrgName = (orgId: string) => {
    const org = orgs.find(org => org.org_id === orgId);
    return org ? org.org_name : orgId;
  };

  // 处理月份选择变化
  const handleMonthChange = (date: any) => {
    if (date) {
      // 从选中日期中提取年份和月份
      setYear(date.$y);
      setMonth(date.$M + 1); // dayjs月份是0-11，需要+1
    }
  };

  // 删除月目标
  const handleDelete = async (targetId: number) => {
    if (!window.confirm('确定要删除此月目标吗？')) {
      return;
    }

    try {
      const response = await salesAPI.deleteSalesTarget(targetId);
      if (response.data.success) {
        // 从列表中移除已删除的目标
        setTargets(targets.filter(target => target.id !== targetId));
      } else {
        setError('删除月目标失败');
      }
    } catch (err) {
      setError('删除月目标失败，请稍后再试');
    }
  };

  // 按父子关系对机构列表进行分组
  const groupOrgsByParent = () => {
    // 获取所有市场（父机构，类型为2）
    const parentOrgs = orgs.filter(org => org.org_type === 2);
    
    // 创建一个映射，key为父机构ID，value为该父机构下的所有子机构
    const orgGroups: { [key: string]: {parent: OrgListItem, children: OrgListItem[]} } = {};
    
    // 初始化映射
    parentOrgs.forEach(parentOrg => {
      orgGroups[parentOrg.org_id] = {
        parent: parentOrg,
        children: []
      };
    });
    
    // 将子机构添加到对应的父机构下
    orgs.forEach(org => {
      // 如果是子机构（类型为3）并且其父机构在我们的映射中
      if (org.org_type === 3 && org.parent_id && orgGroups[org.parent_id]) {
        orgGroups[org.parent_id].children.push(org);
      }
    });
    
    // 按照父机构的sort属性排序
    const sortedGroups = Object.values(orgGroups).sort((a, b) => 
      (a.parent.sort || 0) - (b.parent.sort || 0)
    );
    
    // 每个组内的子机构也按照sort属性排序
    sortedGroups.forEach(group => {
      group.children.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    });
    
    return sortedGroups;
  };

  // 定义表格列
  const columns: ColumnsType<EnhancedMonthlySalesTarget> = [
    {
      title: '年月',
      dataIndex: 'year',
      key: 'year',
      render: (_, record) => `${record.year}年${record.month}月`,
      sorter: (a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      },
    },
    {
      title: '机构',
      dataIndex: 'org_name',
      key: 'org',
      render: (_, record) => getOrgName(record.org_id),
    },
    {
      title: '车辆配置',
      dataIndex: 'car_count',
      key: 'car_count',
      render: (carCount) => carCount !== undefined && carCount !== null ? carCount : '-',
      sorter: (a, b) => (a.car_count || 0) - (b.car_count || 0),
    },
    {
      title: '目标金额',
      dataIndex: 'target_income',
      key: 'target_income',
      render: (amount) => `${amount.toLocaleString()}`,
      sorter: (a, b) => (a.target_income || 0) - (b.target_income || 0),
    },
    {
      title: '实际金额',
      dataIndex: 'actual_income',
      key: 'actual_income',
      render: (amount) => amount !== undefined && amount !== null ? `${Math.round(amount).toLocaleString()}` : '-',
      sorter: (a, b) => (a.actual_income || 0) - (b.actual_income || 0),
    },
    {
      title: '达成率',
      dataIndex: 'ach_rate',
      key: 'ach_rate',
      width: 200,
      render: (rate) => {
        if (rate === undefined || rate === null) return '-';
        const percent = parseFloat(rate);
        // 根据达成率数值决定颜色
        let strokeColor = '#52c41a'; // 默认绿色 (90%-100%)
        if (percent < 40) {
          strokeColor = '#f5222d'; // 危险状态 (0%-40%)
        } else if (percent < 70) {
          strokeColor = '#fa8c16'; // 警告状态 (40%-70%)
        } else if (percent < 90) {
          strokeColor = '#1890ff'; // 良好状态 (70%-90%)
        }
        const intPercent = Math.round(percent);
        return (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Progress 
              percent={intPercent} 
              size="small" 
              strokeColor={strokeColor}
              format={() => `${intPercent}%`}
              style={{ marginRight: 8, flex: 1 }}
            />
          </div>
        );
      },
      sorter: (a, b) => (parseFloat(String(a.ach_rate ?? '0')) - parseFloat(String(b.ach_rate ?? '0'))),
    },
    {
      title: '销售车辆',
      dataIndex: 'sold_car_count',
      key: 'sold_car_count',
      render: (count) => count !== undefined && count !== null ? count : '-',
      sorter: (a, b) => (a.sold_car_count || 0) - (b.sold_car_count || 0),
    },
    {
      title: '车均收入',
      dataIndex: 'per_car_income',
      key: 'per_car_income',
      render: (income) => income !== undefined && income !== null ? `${Math.round(income).toLocaleString()}` : '-',
      sorter: (a, b) => (a.per_car_income || 0) - (b.per_car_income || 0),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <div className="flex justify-end">
          <button
            onClick={() => router.push(`/sales/targets/edit/${record.id}`)}
            className="text-primary-600 hover:text-primary-900 mr-4"
            title="编辑"
          >
            <PencilIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => record.id && handleDelete(record.id)}
            className="text-red-600 hover:text-red-900"
            title="删除"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      ),
    },
  ];

  const orgGroups = groupOrgsByParent();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Spin size="large" /></div>;
  }

  if (!isAuthenticated) {
    return null; // 等待重定向
  }

  return (
    <Layout>
      <Head>
        <title>月-目标管理 | 销售助手</title>
        <meta name="description" content="管理月目标" />
      </Head>

      <ConfigProvider locale={zhCN}>
        <div className="py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-900">月-目标管理</h1>
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
                <label htmlFor="month" className="form-label">年月</label>
                <DatePicker 
                  picker="month" 
                  className="mt-1" 
                  value={dayjs(`${year}-${month.toString().padStart(2, '0')}-01`)}
                  onChange={handleMonthChange}
                  allowClear={false}
                  style={{ width: '100%', minWidth: '120px' }}
                  format="YYYY年MM月"
                />
              </div>
              <div>
                <label htmlFor="org_id" className="form-label">机构</label>
                <Select
                  id="org_id"
                  value={selectedOrgId}
                  onChange={(value: string) => setSelectedOrgId(value)}
                  style={{ width: '100%', minWidth: '200px' }}
                  placeholder="请选择仓库"
                  allowClear
                  className="mt-1"
                >
                  <Option value="">全部</Option>
                  {orgGroups.map(group => (
                    <OptGroup key={group.parent.org_id} label={group.parent.org_name}>
                      {/* 仓库 */}
                      {group.children.map(child => (
                        <Option key={child.org_id} value={child.org_id}>
                          {child.org_name}
                        </Option>
                      ))}
                    </OptGroup>
                  ))}
                </Select>
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

          {/* 月目标列表 - 使用Ant Design表格 */}
          <div className="mt-6">
            <Table 
              columns={columns}
              dataSource={targets}
              rowKey="id"
              loading={isLoadingData}
              pagination={false}
              className="bg-white shadow rounded-md"
              locale={{
                emptyText: (
                  <div className="p-8 text-center text-gray-500">
                    <p className="mb-4">暂无月目标数据</p>
                    <button
                      onClick={() => router.push('/sales/targets/new')}
                      className="btn btn-outline"
                    >
                      <PlusIcon className="h-5 w-5 mr-2" />
                      添加月目标
                    </button>
                  </div>
                )
              }}
            />
            <div className="flex justify-end mt-4">
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={total}
                showSizeChanger
                pageSizeOptions={["10", "20", "50", "100"]}
                onChange={(page, size) => {
                  setCurrentPage(page);
                  setPageSize(size);
                }}
                showTotal={total => `共 ${total} 条`}
              />
            </div>
          </div>
        </div>
      </ConfigProvider>
    </Layout>
  );
};

export default SalesTargetsPage; 