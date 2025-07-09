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
  FloatButton,
  Cascader
} from 'antd';
import type { CascaderProps } from 'antd';
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
import { PlusOutlined, ReloadOutlined, SyncOutlined, VerticalAlignTopOutlined } from '@ant-design/icons';
import { useInView } from 'react-intersection-observer';
import { useIsMobile } from '@/hooks/useIsMobile';
import MobileSalesTable from '@/components/sales/MobileSalesTable';
import DesktopSalesTable from '@/components/sales/DesktopSalesTable';
import VerificationModal from '@/components/ui/VerificationModal';

// 设置 dayjs 为中文
dayjs.locale('zh-cn');

const { Option } = Select;
const { RangePicker } = DatePicker;

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
  const [pageSize, setPageSize] = useState(10);
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.5, // 当元素出现50%时触发
    rootMargin: '100px 0px', // 提前100px触发
  });
  const [showBackTop, setShowBackTop] = useState(false);
  const [tableLoading, setTableLoading] = useState(false); // 添加表格局部加载状态
  
  // 当设备类型变化时更新页面大小
  useEffect(() => {
    setPageSize(10);
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

  // 将机构数据转换为Cascader所需的options格式
  const getCascaderOptions = () => {
    const orgGroups = groupOrgsByParent();
    return orgGroups.map(group => ({
      value: group.parent.org_id,
      label: group.parent.org_name,
      children: group.children.map(child => ({
        value: child.org_id,
        label: child.org_name
      }))
    }));
  };

  // 计算总页数
  const getTotalPages = () => {
    if (!salesRecords?.total) return 0;
    return Math.ceil(salesRecords.total / pageSize);
  };

  // 加载销售记录数据
  const loadSalesRecords = async (values?: any, loadMore: boolean = false, isPagination: boolean = false) => {
    if (!isAuthenticated) return;
    
    try {
      // 根据不同加载类型设置不同的加载状态
      if (isPagination) {
        setTableLoading(true);
      } else if (!loadMore) {
        setIsLoadingData(true);
        // 清空现有数据，只在首次加载或刷新时执行
        setSalesRecords(null);
      } else {
        setIsLoadingMore(true);
      }

      const params: any = { 
        skip: loadMore ? (salesRecords?.items?.length || 0) : 0,
        limit: values?.pageSize || pageSize 
      };

      // 添加筛选条件
      if (values) {
        if (values.org_id) {
          const orgId = Array.isArray(values.org_id) ? values.org_id[values.org_id.length - 1] : values.org_id;
          const warehouseName = getOrgNameById(orgId);
          params.name = warehouseName;
        }
        if (values.dateRange && values.dateRange.length === 2) {
          params.start_date = format(values.dateRange[0].toDate(), 'yyyy-MM-dd');
          params.end_date = format(values.dateRange[1].toDate(), 'yyyy-MM-dd');
        } else if (!values.dateRange && startDate && endDate) {
          params.start_date = format(startDate.toDate(), 'yyyy-MM-dd');
          params.end_date = format(endDate.toDate(), 'yyyy-MM-dd');
        }
      } else if (startDate && endDate) {
        params.start_date = format(startDate.toDate(), 'yyyy-MM-dd');
        params.end_date = format(endDate.toDate(), 'yyyy-MM-dd');
      }

      const response = await salesAPI.getSalesRecords(params);
      
      if (response.data.success) {
        const items = response.data.data?.items || [];
        const total = response.data.data?.pageInfo?.totalCount || 0;
        const summary = response.data.data?.summary;
        
        // 计算是否还有更多数据
        const currentItemCount = loadMore ? (salesRecords?.items?.length || 0) + items.length : items.length;
        const hasMoreData = currentItemCount < total;
        
        // 构建新的数据记录
        const newRecordsData: SalesRecordListResponse = {
          items: loadMore ? [...(salesRecords?.items || []), ...items] : items,
          total,
          current: loadMore ? currentPage + 1 : 1,
          pageSize: values?.pageSize || pageSize,
          summary: loadMore ? salesRecords?.summary : {
            income_amt: summary?.income_amt?.toString() || '0',
            sales_cart_count: summary?.sales_cart_count?.toString() || '0',
            avg_income_amt: summary?.avg_income_amt?.toString() || '0'
          }
        };

        // 更新数据状态
        setSalesRecords(prev => {
          if (loadMore && prev) {
            // 追加模式：合并现有数据和新数据
            return {
              ...prev,
              items: [...prev.items, ...items],
              total,
              current: currentPage + 1
            };
          } else {
            // 重置模式：使用新数据
            return newRecordsData;
          }
        });

        // 更新分页状态
        if (!isPagination) {
          setCurrentPage(loadMore ? currentPage + 1 : 1);
          setHasMore(hasMoreData);
        }
        setError(null);
      } else {
        setError('获取销售记录失败');
      }
    } catch (err) {
      setError('获取销售记录失败，请稍后再试');
    } finally {
      if (isPagination) {
        setTableLoading(false);
      } else if (!loadMore) {
        setIsLoadingData(false);
      } else {
        setIsLoadingMore(false);
      }
      setIsRefreshing(false);
    }
  };

  // 初始加载数据
  useEffect(() => {
    if (isAuthenticated) {
      // 设置默认日期为当天
      const today = dayjs();
      form.setFieldsValue({
        dateRange: [today, today]
      });
      setStartDate(today);
      setEndDate(today);
      
      // 使用当天日期加载数据
      loadSalesRecords({
        dateRange: [today, today]
      });
    }
  }, [isAuthenticated, form]); // 添加form作为依赖项

  // 处理表单查询
  const handleFormSubmit = (values: any) => {
    // 重置所有分页相关状态
    setHasMore(true);
    setCurrentPage(1);
    setIsLoadingMore(false);
    
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
    const today = dayjs();
    form.resetFields();
    form.setFieldsValue({
      dateRange: [today, today]
    });
    setStartDate(today);
    setEndDate(today);
    setCurrentPage(1);
    loadSalesRecords({
      dateRange: [today, today]
    });
  };

  // 处理刷新
  const handleRefresh = () => {
    setIsRefreshing(true);
    const values = form.getFieldsValue();
    loadSalesRecords(values);
  };

  // 处理同步按钮点击
  const handleSyncClick = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    
    // 建立WebSocket连接以接收验证码请求
    connectWebSocket();
    
    try {
      await salesAPI.fetchData({ sync: true });
      message.success('数据同步成功');
      const values = form.getFieldsValue();
      loadSalesRecords(values);
    } catch (error) {
      message.error('数据同步失败');
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
    // 先更新页码，这样用户可以看到页码变化
    setCurrentPage(page);
    if (pageSize !== size) {
      setPageSize(size);
    }
    
    // 获取当前表单的值并加载数据
    const values = form.getFieldsValue();
    loadSalesRecords({
      ...values,
      pageSize: size,
      current: page
    }, false, true);
  };

  // 表格变化处理函数
  const onTableChange = (pagination: any, filters: any, sorter: any) => {
    // 只处理排序等其他变化，分页由单独的分页组件处理
  };

  // 监听滚动加载
  useEffect(() => {
    if (inView && hasMore && !isLoadingMore && !isLoadingData && isMobile && salesRecords?.items?.length) {
      const values = form.getFieldsValue();
      loadSalesRecords(values, true);
    }
  }, [inView, hasMore, isLoadingMore, isLoadingData, isMobile, salesRecords?.items?.length]);

  // 监听滚动位置
  useEffect(() => {
    if (!isMobile) return;

    const handleScroll = () => {
      const summaryCard = document.querySelector('.summary-card');
      if (summaryCard) {
        const rect = summaryCard.getBoundingClientRect();
        setShowBackTop(rect.top <= 24); // 修改判断条件，当卡片顶部到达吸顶位置时显示按钮
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile]);

  // 回到顶部
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
            initialValues={{
              dateRange: [dayjs(), dayjs()]
            }}
          >
            <Form.Item
              name="org_id"
              label="机构"
              className={isMobile ? "w-full mb-0" : "mb-0"}
            >
              <Cascader
                options={getCascaderOptions()}
                placeholder="选择机构"
                allowClear
                showSearch={{ filter: (inputValue, path) => 
                  path.some(option => option.label && option.label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1)
                }}
                className={isMobile ? "w-full" : "w-56"}
                size={isMobile ? "middle" : "middle"}
                styles={{
                  popup: {
                    root: {
                      minWidth: '200px'
                    }
                  }
                }}
                expandTrigger="hover"
                changeOnSelect={true}
              />
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
                  className="w-96"
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
        <div>
          {isMobile ? (
            <MobileSalesTable
              data={salesRecords}
              isLoading={isLoadingData}
              isLoadingMore={isLoadingMore}
              hasMore={hasMore}
              className="w-full"
              onLoadMore={() => {
                if (hasMore && !isLoadingMore) {
                  const values = form.getFieldsValue();
                  loadSalesRecords(values, true);
                }
              }}
            />
          ) : (
            <div>
              <DesktopSalesTable
                data={salesRecords}
                isLoading={isLoadingData}
                onChange={onTableChange}
                className="w-full"
              />
              {/* 桌面端分页 */}
              {salesRecords?.items && salesRecords.items.length > 0 && (
                <div className="flex justify-end p-4 w-full">
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
                    locale={{
                      items_per_page: ' 条/页',
                      jump_to: '跳至',
                      jump_to_confirm: '确定',
                      page: '页',
                      prev_page: '上一页',
                      next_page: '下一页'
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* 移动端浮动按钮 */}
        {isMobile && (
          <>
            {showBackTop && (
              <FloatButton
                icon={<VerticalAlignTopOutlined />}
                className='mb-4'
                onClick={scrollToTop}
                style={{ right: 24, bottom: 90 }}
              />
            )}
            <FloatButton
              icon={isSyncing ? <SyncOutlined spin /> : <SyncOutlined />}
              tooltip={isSyncing ? '正在同步数据' : '同步数据'}
              onClick={() => !isSyncing && handleSyncClick()}
              type="primary"
              style={{ right: 24 }}
            />
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
          onFinish={handleSyncClick}
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

      {/* 验证码模态框 */}
      <VerificationModal />

    </Layout>
  );
};

export default SalesDataPage;