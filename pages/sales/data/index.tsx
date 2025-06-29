import React, { useState, useEffect, useRef } from 'react';
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
  Modal,
  Input,
  Mentions,
  Alert,
  FloatButton
} from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { useAuth } from '@/contexts/AuthContext';
import { useVerification } from '@/contexts/VerificationContext';
import Layout from '@/components/layout/Layout';
import SalesDataTable from '@/components/sales/SalesDataTable';
import { salesAPI, orgsAPI, authAPI } from '@/lib/api';
import apiClient from '@/lib/api'; // 导入原始API客户端实例
import { SalesRecordListResponse, OrgListItem } from '@/types/api';
import { PlusOutlined, ReloadOutlined, SyncOutlined } from '@ant-design/icons';

// 设置 dayjs 为中文
dayjs.locale('zh-cn');

const { Option, OptGroup } = Select;
const { RangePicker } = DatePicker;

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

const SalesDataPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { connectWebSocket } = useVerification();
  const router = useRouter();
  const [salesRecords, setSalesRecords] = useState<SalesRecordListResponse | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<OrgListItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [form] = Form.useForm();
  const isMobile = useIsMobile();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(isMobile ? 20 : 10);
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(null);
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(null);
  
  // 当设备类型变化时更新页面大小
  useEffect(() => {
    setPageSize(isMobile ? 20 : 10);
  }, [isMobile]);
  
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
    
    // 处理移动端日期选择
    if (isMobile && (startDate || endDate)) {
      if (!values.dateRange) {
        values.dateRange = [];
      }
      if (startDate) {
        values.dateRange[0] = startDate;
      }
      if (endDate) {
        values.dateRange[1] = endDate;
      }
    }
    
    loadSalesRecords(values);
  };
  
  // 处理移动端开始日期变更
  const handleStartDateChange = (date: dayjs.Dayjs | null) => {
    setStartDate(date);
  };
  
  // 处理移动端结束日期变更
  const handleEndDateChange = (date: dayjs.Dayjs | null) => {
    setEndDate(date);
  };
  
  // 处理重置
  const handleReset = () => {
    form.resetFields();
    setStartDate(null);
    setEndDate(null);
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
      
      // 同步开始后立即隐藏对话框
      setSyncModalVisible(false);
      
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
      
      // 如果平台是美团或所有平台，连接WebSocket
      if (values.platform === 'meituan' || values.platform === 'all') {
        connectWebSocket();
      }
      
      // 调用同步API
      const response = await salesAPI.fetchData(params);
      
      if (response.data.success) {
        // 同步请求发送成功，提示用户等待
        message.success('数据同步已完成');
        setIsSyncing(false);
        // 同步完成后自动刷新页面数据
        handleRefresh();
      } else {
        message.error(response.data.message || '同步失败');
        setIsSyncing(false);
      }
    } catch (error) {
      message.error('同步请求失败，请稍后再试');
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
        <meta name="description" content="查看和管理销售数据" />
      </Head>

      <div className={`py-4 md:py-6 ${isMobile ? 'px-3' : 'px-6'}`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4 md:gap-0">
          <div>
            <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-semibold text-gray-900`}>数据中心</h1>
            <p className="mt-1 text-sm text-gray-500">
              查看和管理销售数据记录。
            </p>
          </div>
          {!isMobile && (
            <div className="flex flex-wrap gap-2 self-end md:self-auto">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => router.push('/sales/data/new')}
                className="rounded-lg"
                size="middle"
              >
                新增
              </Button>
              <Button
                icon={<SyncOutlined />}
                onClick={handleSyncClick}
                className="rounded-lg"
                size="middle"
                loading={isSyncing}
                disabled={isSyncing}
              >
                {isSyncing ? '正在同步' : '同步'}
              </Button>
            </div>
          )}
        </div>

        {/* 搜索表单 */}
        <div className="bg-white p-4 rounded-xl shadow-md mb-4">
          <Form
            form={form}
            layout={isMobile ? "vertical" : "inline"}
            onFinish={handleFormSubmit}
            className={`${isMobile ? 'space-y-3' : 'flex flex-wrap gap-3 items-end'}`}
            size={isMobile ? "middle" : "middle"}
          >
            <Form.Item
              name="org_id"
              label="机构"
              className={isMobile ? "w-full mb-0" : "mb-0"}
            >
              <Select 
                placeholder="选择机构" 
                allowClear 
                showSearch
                optionFilterProp="children"
                className={isMobile ? "w-full" : "w-40"}
                size={isMobile ? "middle" : "middle"}
              >
                {orgGroups.map(group => (
                  <OptGroup key={group.parent.org_id} label={group.parent.org_name}>
                    {group.children.map(child => (
                      <Option key={child.org_id} value={child.org_id}>{child.org_name}</Option>
                    ))}
                  </OptGroup>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="dateRange"
              label="日期范围"
              className={isMobile ? "w-full mb-0" : "mb-0"}
            >
              {isMobile ? (
                <div className="flex space-x-2">
                  <DatePicker 
                    className="flex-1"
                    placeholder="开始日期"
                    format="YYYY年MM月DD日"
                    size="middle"
                    onChange={handleStartDateChange}
                    value={startDate}
                    locale={zhCN.DatePicker}
                    inputReadOnly={true}
                    style={{ caretColor: 'transparent' }}
                  />
                  <span className="flex items-center text-gray-400">至</span>
                  <DatePicker 
                    className="flex-1"
                    placeholder="结束日期"
                    format="YYYY年MM月DD日"
                    size="middle"
                    onChange={handleEndDateChange}
                    value={endDate}
                    locale={zhCN.DatePicker}
                    inputReadOnly={true}
                    style={{ caretColor: 'transparent' }}
                  />
                </div>
              ) : (
                <RangePicker 
                  className="w-64"
                  size="middle"
                  placeholder={['开始日期', '结束日期']}
                  format="YYYY年MM月DD日"
                  locale={zhCN.DatePicker}
                  inputReadOnly={true}
                  style={{ caretColor: 'transparent' }}
                />
              )}
            </Form.Item>
            <Form.Item className={isMobile ? "w-full mb-0" : "mb-0"}>
              <div className={isMobile ? "flex gap-2" : ""}>
                <Button 
                  type="primary" 
                  htmlType="submit"
                  className="rounded-lg mr-2"
                  size={isMobile ? "middle" : "middle"}
                >
                  查询
                </Button>
                <Button 
                  onClick={handleReset}
                  className="rounded-lg"
                  size={isMobile ? "middle" : "middle"}
                >
                  重置
                </Button>
              </div>
            </Form.Item>
          </Form>
        </div>

        {/* 错误提示 */}
        {error && (
          <Alert message={error} type="error" showIcon className="mb-4 rounded-lg" />
        )}

        {/* 销售数据表格 */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <SalesDataTable
            data={salesRecords}
            isLoading={isLoadingData}
            onChange={onTableChange}
            className="w-full"
          />
          {!isMobile && (
            <div className="flex justify-end p-4">
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={salesRecords?.total || 0}
                onChange={handlePaginationChange}
                showSizeChanger
                showQuickJumper
                showTotal={(total) => `共 ${total} 条记录`}
                size="default"
                pageSizeOptions={["10", "20", "50", "100"]}
                defaultPageSize={10}
              />
            </div>
          )}
        </div>

        {/* 移动端分页 */}
        {isMobile && salesRecords && salesRecords.total > 0 && (
          <div className="bg-white rounded-xl shadow-md mt-4 p-4">
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={salesRecords.total}
              onChange={handlePaginationChange}
              showSizeChanger
              showTotal={(total) => `共 ${total} 条记录`}
              size="small"
              className="flex justify-center flex-wrap"
              pageSizeOptions={["10", "20", "50"]}
              defaultPageSize={20}
              simple={false}
              showQuickJumper={false}
            />
          </div>
        )}

        {/* 移动端浮动按钮 */}
        {isMobile && (
          <>
            <FloatButton.Group
              trigger="click"
              type="primary"
              style={{ right: 24 }}
              icon={<PlusOutlined />}
            >
              <FloatButton
                icon={<PlusOutlined />}
                tooltip="新增记录"
                onClick={() => router.push('/sales/data/new')}
              />
              <FloatButton
                icon={isSyncing ? <SyncOutlined spin /> : <SyncOutlined />}
                tooltip={isSyncing ? '正在同步数据' : '同步数据'}
                onClick={() => !isSyncing && handleSyncClick()}
              />
            </FloatButton.Group>
          </>
        )}
      </div>

      {/* 同步数据对话框 */}
      <Modal
        title="同步销售数据"
        open={syncModalVisible}
        onCancel={() => setSyncModalVisible(false)}
        footer={null}
        width={isMobile ? "90%" : 520}
        className="rounded-lg"
      >
        <Form
          form={syncForm}
          layout="vertical"
          onFinish={handleSyncSubmit}
        >
          <Form.Item
            name="date"
            label="选择日期"
            rules={[{ required: true, message: '请选择日期' }]}
          >
            <DatePicker 
              style={{ width: '100%' }} 
              format="YYYY-MM-DD"
              placeholder="选择日期"
              className="rounded-lg"
            />
          </Form.Item>
          
          <Form.Item
            name="platform"
            label="选择平台"
            rules={[{ required: true, message: '请选择平台' }]}
            initialValue="all"
          >
            <Select 
              placeholder="选择平台" 
              className="rounded-lg"
            >
              <Option value="all">所有平台</Option>
              <Option value="duowei">多维</Option>
              <Option value="meituan">美团</Option>
            </Select>
          </Form.Item>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button 
              onClick={() => setSyncModalVisible(false)}
              className="rounded-lg"
            >
              取消
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={isSyncing}
              className="rounded-lg"
            >
              开始同步
            </Button>
          </div>
        </Form>
      </Modal>


    </Layout>
  );
};

export default SalesDataPage;