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
import Layout from '@/components/layout/Layout';
import SalesDataTable from '@/components/sales/SalesDataTable';
import { salesAPI, orgsAPI, authAPI } from '@/lib/api';
import apiClient from '@/lib/api'; // 导入原始API客户端实例
import { SalesRecordListResponse, OrgListItem } from '@/types/api';
import { PlusOutlined, ReloadOutlined, SyncOutlined } from '@ant-design/icons';

// 设置 dayjs 为中文
dayjs.locale('zh-cn');

// WebSocket地址
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://127.0.0.1:8000/ws';

// 配置message，取消所有验证码相关提示
const originalSuccessMethod = message.success;
const originalErrorMethod = message.error;

// 自定义函数来过滤验证码相关消息
const shouldFilterMessage = (content: any): boolean => {
  return typeof content === 'string' && 
    (content.toLowerCase().includes('verification') || 
     content.includes('验证码'));
};

// 添加过滤功能，保持原有函数签名
const filteredSuccessMethod: typeof message.success = (content, duration?, onClose?) => {
  if (shouldFilterMessage(content)) {
    // 返回一个空的MessageType对象
    return 'filtered-message' as any;
  }
  return originalSuccessMethod(content, duration, onClose);
};

const filteredErrorMethod: typeof message.error = (content, duration?, onClose?) => {
  if (shouldFilterMessage(content)) {
    // 返回一个空的MessageType对象
    return 'filtered-message' as any;
  }
  return originalErrorMethod(content, duration, onClose);
};

message.success = filteredSuccessMethod;
message.error = filteredErrorMethod;

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
  
  // WebSocket相关状态
  const wsRef = useRef<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [needVerification, setNeedVerification] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [verificationTaskId, setVerificationTaskId] = useState('');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [verificationModalVisible, setVerificationModalVisible] = useState(false);
  const [countDown, setCountDown] = useState(60);
  const [countDownActive, setCountDownActive] = useState(false);
  const countDownRef = useRef<NodeJS.Timeout | null>(null);
  const verificationInputRefs = useRef<any[]>([]);
  const [phoneNumber, setPhoneNumber] = useState('未知手机号');
  
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

  // 连接WebSocket
  const connectWebSocket = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return; // 已连接，不需要重复连接
    }
    
    // 创建WebSocket连接
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    
    // 连接成功事件
    ws.onopen = () => {
      setWsConnected(true);
      // 订阅验证频道
      ws.send(JSON.stringify({
        type: 'subscribe',
        channels: ['verification']
      }));
    };
    
    // 接收消息事件
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // 处理需要验证的情况
        if (data.type === 'verification_needed') {
          setVerificationTaskId(data.task_id);
          setVerificationMessage(data.message);
          
          // 提取手机号
          let extractedPhone = '未知手机号';
          if (data.message) {
            // 尝试匹配 "请为手机 xxx 输入" 格式
            const phoneMatch = data.message.match(/请为手机\s+(.*?)\s+输入/);
            if (phoneMatch && phoneMatch[1]) {
              extractedPhone = phoneMatch[1];
            }
          }
          setPhoneNumber(extractedPhone);
          
          setVerificationModalVisible(true);
          setVerificationCode(['', '', '', '', '', '']); // 重置验证码输入
          
          // 初始化引用数组
          verificationInputRefs.current = Array(6).fill(null);
          
          // 启动倒计时
          setCountDown(60);
          setCountDownActive(true);
          
          if (countDownRef.current) {
            clearInterval(countDownRef.current);
          }
          
          countDownRef.current = setInterval(() => {
            setCountDown((prev) => {
              if (prev <= 1) {
                clearInterval(countDownRef.current as NodeJS.Timeout);
                setCountDownActive(false);
                setVerificationModalVisible(false); // 倒计时结束关闭对话框
                closeWebSocket(); // 关闭WebSocket连接
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
          
          // 自动聚焦到第一个输入框
          setTimeout(() => {
            if (verificationInputRefs.current[0]) {
              verificationInputRefs.current[0].focus();
            }
          }, 100);
        }
        
        // 处理验证成功的情况
        if (data.type === 'verification_success') {
          // 这个逻辑已经移到handleVerificationSubmit中处理
          // 这里可以作为备用处理，但通常不会执行到
          if (verificationModalVisible) {
            setVerificationModalVisible(false);
            
            if (countDownRef.current) {
              clearInterval(countDownRef.current);
              setCountDownActive(false);
            }
            
            message.success('验证码验证成功');
          }
        }
      } catch (error) {
        console.error('解析WebSocket消息失败:', error);
      }
    };
    
    // 错误事件
    ws.onerror = (error) => {
      setWsConnected(false);
    };
    
    // 关闭事件
    ws.onclose = () => {
      setWsConnected(false);
    };
  };
  
  // 关闭WebSocket连接
  const closeWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setWsConnected(false);
    }
  };
  
  // 组件卸载时关闭WebSocket
  useEffect(() => {
    return () => {
      closeWebSocket();
      if (countDownRef.current) {
        clearInterval(countDownRef.current);
      }
    };
  }, []);

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
  
  // 处理验证码输入变化
  const handleVerificationInputChange = (index: number, value: string) => {
    // 如果倒计时已结束，不允许输入
    if (!countDownActive) {
      return;
    }
    
    if (value.length > 1) {
      value = value.charAt(0); // 只取第一个字符
    }
    
    // 更新验证码数组
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);
    
    // 如果输入了字符，且不是最后一个输入框，则自动聚焦到下一个输入框
    if (value && index < 5) {
      const nextInput = verificationInputRefs.current[index + 1];
      if (nextInput) {
        nextInput.focus();
      }
    }
    
    // 检查是否所有输入框都已填写，如果是则立即关闭对话框并在后台提交
    if (newCode.every(c => c) && newCode.length === 6) {
      // 立即关闭对话框
      setVerificationModalVisible(false);
      
      // 清理验证码相关状态
      setVerificationCode(['', '', '', '', '', '']);
      const taskId = verificationTaskId; // 保存任务ID用于后台提交
      setVerificationTaskId('');
      setVerificationMessage('');
      
      // 清理倒计时
      if (countDownRef.current) {
        clearInterval(countDownRef.current);
        setCountDownActive(false);
      }
      
      // 关闭WebSocket连接
      closeWebSocket();
      
      // 在后台提交验证码（不阻塞UI）
      handleVerificationSubmit(newCode.join(''), taskId);
    }
  };
  
  // 处理验证码输入框键盘事件
  const handleVerificationKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // 如果按下退格键，且当前输入框为空，则聚焦到前一个输入框
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      const prevInput = verificationInputRefs.current[index - 1];
      if (prevInput) {
        prevInput.focus();
      }
    }
  };

  // 处理验证码提交
  const handleVerificationSubmit = async (code: string, taskId: string) => {
    if (!taskId || !code || code.length !== 6) {
      return;
    }
    
    try {
      // 直接使用apiClient提交验证码，不使用authAPI，避免全局消息
      const response = await apiClient.post(`/api/auth/verification/${taskId}/submit`, { code });
      
      if (response.data.success) {
        // 显示成功提示
        message.success('验证码验证成功');
      } else {
        // 验证失败提示
        message.error('验证码错误');
      }
    } catch (error) {
      // 提交失败提示
      message.error('验证码提交失败');
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
          <div className={`flex justify-end p-4 ${isMobile ? 'flex-wrap gap-2' : ''}`}>
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={salesRecords?.total || 0}
              onChange={handlePaginationChange}
              showSizeChanger
              showQuickJumper={!isMobile}
              showTotal={(total) => `共 ${total} 条记录`}
              size={isMobile ? "small" : "default"}
              className={isMobile ? "w-full flex justify-center" : ""}
              pageSizeOptions={isMobile ? ["10", "20", "50"] : ["10", "20", "50", "100"]}
              defaultPageSize={isMobile ? 20 : 10}
            />
          </div>
        </div>

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

      {/* 验证码对话框 */}
      <Modal
        title="验证码确认"
        open={verificationModalVisible}
        onCancel={() => {
          // 允许用户随时关闭对话框
          setVerificationModalVisible(false);
          
          // 清理验证码相关状态
          setVerificationCode(['', '', '', '', '', '']);
          setVerificationTaskId('');
          setVerificationMessage('');
          
          // 清理倒计时
          if (countDownRef.current) {
            clearInterval(countDownRef.current);
            setCountDownActive(false);
          }
          
          // 关闭WebSocket连接
          closeWebSocket();
        }}
        footer={null}
        width={isMobile ? "90%" : 420}
        maskClosable={true}
        className="rounded-lg"
        closable={true}
      >
        <div className="text-center mb-4">
          <p className="mb-2">请输入发送到 <strong>{phoneNumber}</strong> 的验证码</p>
          <p className="text-sm text-gray-500 hidden">
            输入完成后将自动提交，{countDown} 秒后自动关闭
          </p>
        </div>
        
        <div className="flex justify-center gap-2 mb-6">
          {verificationCode.map((digit, index) => (
            <Input
              key={index}
              ref={(el) => verificationInputRefs.current[index] = el}
              value={digit}
              onChange={(e) => handleVerificationInputChange(index, e.target.value)}
              onKeyDown={(e) => handleVerificationKeyDown(index, e)}
              className="w-10 h-12 text-center text-xl rounded-lg"
              maxLength={1}
              autoFocus={index === 0}
              disabled={!countDownActive}
            />
          ))}
        </div>
        
        {/* 倒计时提示 */}
        <div className="text-center">
          {countDownActive && (
            <div className="flex items-center justify-center text-blue-600">
              <div className="animate-pulse mr-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              </div>
              <p className="text-sm">
                倒计时 <span className="font-mono text-lg font-semibold">{countDown}</span> 秒后，自动关闭
              </p>
            </div>
          )}
        </div>
      </Modal>
    </Layout>
  );
};

export default SalesDataPage;