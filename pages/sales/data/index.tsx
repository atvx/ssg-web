import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { PlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { 
  DatePicker, 
  Select, 
  Button, 
  Spin, 
  ConfigProvider, 
  Form, 
  message,
  Pagination,
  Modal
} from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import SalesDataTable from '@/components/sales/SalesDataTable';
import { salesAPI, orgsAPI } from '@/lib/api';
import { SalesRecordListResponse, OrgListItem } from '@/types/api';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';

// 设置 dayjs 为中文
dayjs.locale('zh-cn');

const { Option, OptGroup } = Select;
const { RangePicker } = DatePicker;

const SalesDataPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [salesRecords, setSalesRecords] = useState<SalesRecordListResponse | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<OrgListItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [form] = Form.useForm();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // 同步对话框相关状态
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [syncForm] = Form.useForm();
  const [isSyncing, setIsSyncing] = useState(false);

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

  // 根据org_id获取org_name
  const getOrgNameById = (orgId: string) => {
    const org = orgs.find(org => org.org_id === orgId);
    return org ? org.org_name : '';
  };

  // 加载销售记录数据
  const loadSalesRecords = async (values?: any) => {
    if (!isAuthenticated) return;
    
    try {
      setIsLoadingData(true);
      const params: any = { 
        skip: (currentPage - 1) * pageSize, 
        limit: pageSize 
      };

      // 添加筛选条件
      if (values) {
        if (values.org_id) {
          // 使用org_name作为warehouse参数
          const warehouseName = getOrgNameById(values.org_id);
          params.warehouse = warehouseName;
        }
        if (values.status) {
          params.status = values.status;
        }
        if (values.dateRange && values.dateRange.length === 2) {
          params.start_date = format(values.dateRange[0].toDate(), 'yyyy-MM-dd');
          params.end_date = format(values.dateRange[1].toDate(), 'yyyy-MM-dd');
        }
      }

      const response = await salesAPI.getSalesRecords(params);
      
      if (response.data.success) {
        // 根据截图API响应格式，构造与组件期望匹配的数据结构
        const items = Array.isArray(response.data.data) ? response.data.data : [];
        const total = response.data.total || items.length;
        
        const recordsData: SalesRecordListResponse = {
          items,
          total,
          current: currentPage,
          pageSize: pageSize
        };

        setSalesRecords(recordsData);
        setError(null);
      } else {
        setError('获取销售记录失败');
      }
    } catch (err) {
      console.error('API错误:', err);
      setError('获取销售记录失败，请稍后再试');
    } finally {
      setIsLoadingData(false);
      setIsRefreshing(false);
    }
  };

  // 初始加载数据
  useEffect(() => {
    if (isAuthenticated) {
      loadSalesRecords();
    }
  }, [isAuthenticated]); // 仅在认证状态变化时重新加载

  // 处理表单查询
  const handleFormSubmit = (values: any) => {
    setCurrentPage(1); // 重置页码
    loadSalesRecords(values);
  };

  // 处理重置
  const handleReset = () => {
    form.resetFields();
    setCurrentPage(1);
    loadSalesRecords();
  };

  // 处理刷新
  const handleRefresh = () => {
    setIsRefreshing(true);
    const values = form.getFieldsValue();
    loadSalesRecords(values);
  };

  // 处理同步按钮点击
  const handleSyncClick = () => {
    // 重置同步表单
    syncForm.resetFields();
    // 默认设置为今天日期
    syncForm.setFieldsValue({
      date: dayjs(),
      platform: 'all'
    });
    // 显示同步对话框
    setSyncModalVisible(true);
  };

  // 处理同步数据提交
  const handleSyncSubmit = async (values: any) => {
    try {
      setIsSyncing(true);
      
      // 构造同步参数
      const params: any = {
        sync: true
      };
      
      if (values.date) {
        params.date = format(values.date.toDate(), 'yyyy-MM-dd');
      }
      
      if (values.platform && values.platform !== 'all') {
        params.platform = values.platform;
      }
      
      // 调用同步API
      const response = await salesAPI.fetchData(params);
      
      if (response.data.success) {
        message.success('数据同步任务已启动，请稍后刷新查看结果');
        setSyncModalVisible(false);
        // 延迟几秒后刷新数据
        setTimeout(() => {
          handleRefresh();
        }, 3000);
      } else {
        message.error(response.data.message || '同步失败');
      }
    } catch (error) {
      message.error('同步请求失败，请稍后再试');
    } finally {
      setIsSyncing(false);
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

  // 处理分页变化
  const handlePaginationChange = (page: number, size: number) => {
    setCurrentPage(page);
    if (pageSize !== size) {
      setPageSize(size);
    }
    
    // 分页变化后立即加载数据
    setIsRefreshing(true);
    setIsLoadingData(true);
    
    const values = form.getFieldsValue();
    const params: any = { 
      skip: (page - 1) * size, 
      limit: size 
    };
    
    // 添加筛选条件
    if (values) {
      if (values.org_id) {
        // 使用org_name作为warehouse参数
        const warehouseName = getOrgNameById(values.org_id);
        params.warehouse = warehouseName;
      }
      if (values.status) {
        params.status = values.status;
      }
      if (values.dateRange && values.dateRange.length === 2) {
        params.start_date = format(values.dateRange[0].toDate(), 'yyyy-MM-dd');
        params.end_date = format(values.dateRange[1].toDate(), 'yyyy-MM-dd');
      }
    }
    
    // 直接调用API
    salesAPI.getSalesRecords(params)
      .then(response => {
        if (response.data.success) {
          const items = Array.isArray(response.data.data) ? response.data.data : [];
          const total = response.data.total || items.length;
          
          const recordsData: SalesRecordListResponse = {
            items,
            total,
            current: page,
            pageSize: size
          };
          
          setSalesRecords(recordsData);
          setError(null);
        } else {
          setError('获取销售记录失败');
        }
      })
      .catch(err => {
        console.error('API错误:', err);
        setError('获取销售记录失败，请稍后再试');
      })
      .finally(() => {
        setIsLoadingData(false);
        setIsRefreshing(false);
      });
  };

  // 表格变化处理函数
  const onTableChange = (pagination: any, filters: any, sorter: any) => {
    // 只处理排序等其他变化，分页由单独的分页组件处理
    console.log('表格变化:', { filters, sorter });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Spin size="large" /></div>;
  }

  if (!isAuthenticated) {
    return null; // 等待重定向
  }

  const orgGroups = groupOrgsByParent();

  return (
    <Layout>
      <Head>
        <title>数据中心 | 销售助手</title>
        <meta name="description" content="管理销售记录" />
      </Head>

      <ConfigProvider locale={zhCN}>
        <div className="py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">数据中心</h1>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => router.push('/sales/data/new')}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              新增记录
            </Button>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            管理和查看营业销售数据。
          </p>

          {/* 筛选器 */}
          <div className="bg-white p-3 sm:p-4 rounded-md shadow mb-4 mt-6">
            <Form
              form={form}
              onFinish={handleFormSubmit}
              layout="vertical"
              className="flex flex-col sm:flex-row flex-wrap gap-3"
            >
              <Form.Item 
                name="dateRange" 
                label="日期范围"
                className="mb-0 sm:min-w-[240px]"
              >
                <RangePicker 
                  format="YYYY-MM-DD"
                  allowClear
                />
              </Form.Item>
              
              <Form.Item 
                name="org_id" 
                label="机构"
                className="mb-0"
              >
                <Select
                  placeholder="选择机构"
                  allowClear
                  style={{ width: '100%', minWidth: '200px' }}
                >
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
              </Form.Item>
              
              <div className="flex items-end gap-2 mt-2 sm:mt-0 mb-0">
                <Button 
                  type="primary"
                  htmlType="submit"
                  disabled={isRefreshing}
                >
                  查询
                </Button>
                <Button
                  onClick={() => {
                    // 重置表单和分页
                    form.resetFields();
                    setCurrentPage(1);
                    
                    // 立即加载数据
                    setIsRefreshing(true);
                    setIsLoadingData(true);
                    
                    // 使用默认参数构建请求
                    const params = { 
                      skip: 0, 
                      limit: pageSize 
                    };
                    
                    // 直接调用API
                    salesAPI.getSalesRecords(params)
                      .then(response => {
                        if (response.data.success) {
                          const items = Array.isArray(response.data.data) ? response.data.data : [];
                          const total = response.data.total || items.length;
                          
                          const recordsData: SalesRecordListResponse = {
                            items,
                            total,
                            current: 1,
                            pageSize
                          };
                          
                          setSalesRecords(recordsData);
                          setError(null);
                        } else {
                          setError('获取销售记录失败');
                        }
                      })
                      .catch(err => {
                        console.error('API错误:', err);
                        setError('获取销售记录失败，请稍后再试');
                      })
                      .finally(() => {
                        setIsLoadingData(false);
                        setIsRefreshing(false);
                      });
                  }}
                >
                  重置
                </Button>
                <Button
                  disabled={isRefreshing}
                  onClick={handleSyncClick}
                  icon={<ArrowPathIcon className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />}
                >
                  同步
                </Button>
              </div>
            </Form>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* 销售记录表格 */}
          <div className="mt-6">
            <SalesDataTable 
              data={salesRecords}
              isLoading={isLoadingData}
              className="bg-white shadow rounded-md"
              onDelete={handleRefresh}
              onChange={onTableChange}
            />
            <div className="flex justify-end mt-4">
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={salesRecords?.total || 0}
                showSizeChanger
                pageSizeOptions={["10", "20", "50", "100"]}
                onChange={handlePaginationChange}
                showTotal={total => `共 ${total} 条`}
              />
            </div>
          </div>
        </div>
      </ConfigProvider>

      {/* 同步数据对话框 */}
      <Modal
        title="同步销售数据"
        open={syncModalVisible}
        onCancel={() => setSyncModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={syncForm}
          layout="vertical"
          onFinish={handleSyncSubmit}
        >
          <Form.Item
            name="date"
            label="选择日期"
            rules={[{ required: true, message: '请选择需要同步的日期' }]}
          >
            <DatePicker 
              style={{ width: '100%' }} 
              format="YYYY-MM-DD"
              placeholder="选择日期"
            />
          </Form.Item>
          
          <Form.Item
            name="platform"
            label="选择平台"
            rules={[{ required: true, message: '请选择平台' }]}
            initialValue="all"
          >
            <Select placeholder="选择平台">
              <Option value="all">所有平台</Option>
              <Option value="duowei">多维</Option>
              <Option value="meituan">美团</Option>
            </Select>
          </Form.Item>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => setSyncModalVisible(false)}>
              取消
            </Button>
            <Button type="primary" htmlType="submit" loading={isSyncing}>
              开始同步
            </Button>
          </div>
        </Form>
      </Modal>
    </Layout>
  );
};

export default SalesDataPage; 