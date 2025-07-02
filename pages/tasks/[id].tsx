import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { tasksAPI } from '@/lib/api';
import { Task } from '@/types/api';
import { 
  Spin, 
  Button, 
  Alert, 
  Tag, 
  Space, 
  Typography,
  ConfigProvider,
  Card,
  Descriptions,
  Divider,
  Result,
  Breadcrumb,
  Modal,
  Progress,
  Badge,
  Avatar,
  Timeline,
  Empty,
  message
} from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  ClockCircleOutlined, 
  DeleteOutlined, 
  ArrowLeftOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  CalendarOutlined,
  UserOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  CodeOutlined,
  CopyOutlined
} from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import { usePullToRefresh } from '@/lib/usePullToRefresh';

const { Title, Text, Paragraph } = Typography;
const { confirm } = Modal;

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

const TaskDetailPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const taskId = id ? parseInt(id as string) : undefined;
  const isMobile = useIsMobile();
  
  const [task, setTask] = useState<Task | null>(null);
  const [isLoadingTask, setIsLoadingTask] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 如果用户未登录，重定向到登录页
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // 获取任务详情
  const fetchTaskDetail = async () => {
    if (isAuthenticated && taskId) {
      try {
        setIsLoadingTask(true);
        setError(null);
        const response = await tasksAPI.getTask(taskId);
        if (response.data.success && response.data.data) {
          setTask(response.data.data as Task);
        } else {
          setError('获取任务详情失败');
        }
      } catch (err) {
        setError('获取任务详情失败，请稍后再试');
      } finally {
        setIsLoadingTask(false);
      }
    }
  };

  // 首次加载获取任务详情
  useEffect(() => {
    if (isAuthenticated && taskId) {
      fetchTaskDetail();
    }
  }, [isAuthenticated, taskId]);

  // 删除任务
  const handleDeleteTask = () => {
    if (!taskId) return;
    
    confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: '确定要删除此任务吗？删除后不可恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        try {
          const response = await tasksAPI.deleteTask(taskId);
          if (response.data.success) {
            router.push('/tasks');
          } else {
            setError(response.data.message || '删除任务失败');
          }
        } catch (err) {
          setError('删除任务失败，请稍后再试');
        }
      }
    });
  };

  // 刷新任务详情
  const handleRefresh = () => {
    fetchTaskDetail();
  };

  // 移动端下拉刷新
  usePullToRefresh(handleRefresh, isMobile);

  // 获取任务状态颜色和图标
  const getStatusInfo = (status: string) => {
    switch(status) {
      case 'completed':
        return { 
          icon: <CheckCircleOutlined />, 
          color: 'success',
          textColor: 'text-emerald-500',
          bgColor: 'bg-emerald-50',
          avatarBg: 'bg-emerald-500',
          text: '已完成'
        };
      case 'failed':
        return { 
          icon: <CloseCircleOutlined />, 
          color: 'error',
          textColor: 'text-red-500',
          bgColor: 'bg-red-50',
          avatarBg: 'bg-red-500',
          text: '失败'
        };
      case 'running':
        return { 
          icon: <SyncOutlined spin />, 
          color: 'processing',
          textColor: 'text-blue-500',
          bgColor: 'bg-blue-50',
          avatarBg: 'bg-blue-500',
          text: '运行中'
        };
      case 'pending':
        return { 
          icon: <ClockCircleOutlined />, 
          color: 'warning',
          textColor: 'text-amber-500',
          bgColor: 'bg-amber-50',
          avatarBg: 'bg-amber-500',
          text: '等待中'
        };
      case 'processing':
        return { 
          icon: <SyncOutlined spin />, 
          color: 'processing',
          textColor: 'text-blue-500',
          bgColor: 'bg-blue-50',
          avatarBg: 'bg-blue-500',
          text: '处理中'
        };
      default:
        return { 
          icon: <InfoCircleOutlined />, 
          color: 'default',
          textColor: 'text-gray-500',
          bgColor: 'bg-gray-50',
          avatarBg: 'bg-gray-500',
          text: status
        };
    }
  };

  // 格式化JSON显示
  const formatJson = (json: any) => {
    try {
      if (typeof json === 'string') {
        return JSON.stringify(JSON.parse(json), null, 2);
      }
      return JSON.stringify(json, null, 2);
    } catch (e) {
      return json ? json.toString() : '无数据';
    }
  };

  // 复制到剪贴板
  const handleCopy = (content: any) => {
    try {
      const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
      navigator.clipboard.writeText(text);
      message.success('已复制到剪贴板');
    } catch (err) {
      message.error('复制失败');
    }
  };

  // 任务类型中文映射
  const getTaskTypeName = (type?: string) => {
    switch (type) {
      case 'fetch_meituan':
        return '美团';
      case 'fetch_duowei':
        return '多维';
      case 'fetch_all':
        return '所有平台';
      default:
        return type || '--';
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Spin size="large" /></div>;
  }

  if (!isAuthenticated) {
    return null; // 等待重定向
  }

  // 任务状态信息
  const statusInfo = task ? getStatusInfo(task.status) : { 
    icon: <InfoCircleOutlined />, 
    color: 'default',
    textColor: 'text-gray-500',
    bgColor: 'bg-gray-50',
    avatarBg: 'bg-gray-500',
    text: '未知'
  };

  return (
    <Layout>
      <Head>
        <title>任务详情 | 销售助手</title>
        <meta name="description" content="查看任务详细信息" />
      </Head>

      <ConfigProvider locale={zhCN}>
        <div className={`min-h-screen ${isMobile ? 'bg-white' : 'py-4 md:py-6 px-6 bg-gray-50'}`}>
          {/* 面包屑导航 - 仅在非移动端显示 */}
          {!isMobile && (
            <Breadcrumb 
              className="mb-4"
              items={[
                {
                  title: <a onClick={() => router.push('/tasks')}>任务中心</a>
                },
                {
                  title: '任务详情'
                }
              ]}
            />
          )}

          {/* 移动端顶部导航栏 */}
          {isMobile && (
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center">
                <Button
                  type="text"
                  icon={<ArrowLeftOutlined />}
                  onClick={() => router.push('/tasks')}
                  size="middle"
                  className="flex items-center justify-center p-0 -ml-2"
                />
                <span className="text-lg ml-1">任务详情</span>
              </div>
              <Button 
                danger 
                type="text"
                icon={<DeleteOutlined />}
                onClick={handleDeleteTask}
                size="middle"
                className="text-red-500"
              >
                删除
              </Button>
            </div>
          )}

          {!isMobile && (
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-3">
              <div className="flex items-center">
                <Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>任务详情</Title>
              </div>
              <Space wrap={isMobile} size={isMobile ? "small" : "middle"} className="self-end md:self-auto">
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={handleRefresh}
                  loading={isLoadingTask}
                  size="middle"
                  className="rounded-lg flex items-center"
                >
                  刷新
                </Button>
                <Button 
                  danger 
                  icon={<DeleteOutlined />} 
                  onClick={handleDeleteTask}
                  size="middle"
                  className="rounded-lg flex items-center"
                >
                  删除
                </Button>
                <Button 
                  icon={<ArrowLeftOutlined />} 
                  onClick={() => router.push('/tasks')}
                  className="rounded-lg"
                >
                  返回
                </Button>
              </Space>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <Alert 
              message={error} 
              type="error" 
              showIcon 
              className={`mb-5 rounded-lg ${isMobile ? 'mx-5' : ''}`}
            />
          )}

          {/* 任务详情 */}
          {isLoadingTask ? (
            <div className="flex flex-col justify-center items-center py-20">
              <Spin size="large" />
              <div className="mt-3 text-gray-500">加载任务信息...</div>
            </div>
          ) : task ? (
            <div className={isMobile ? 'px-5 py-4' : ''}>
              {/* 状态信息 - 移动端风格 */}
              {isMobile && (
                <div className="bg-green-50 rounded-xl p-4 mb-6 flex items-center">
                  <div className={`w-12 h-12 rounded-full ${statusInfo.avatarBg} flex items-center justify-center mr-4`}>
                    <span className="text-white text-xl">
                      {statusInfo.icon}
                    </span>
                  </div>
                  <div>
                    <div className={`text-lg font-medium ${statusInfo.textColor}`}>
                      {statusInfo.text}
                    </div>
                    <div className="text-gray-600">
                      所有平台
                    </div>
                  </div>
                </div>
              )}
              
              {/* 桌面端状态卡片 */}
              {!isMobile && (
                <div className="mb-5 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="flex flex-col md:flex-row md:items-center">
                    <div className={`p-4 md:p-6 ${statusInfo.bgColor} flex-shrink-0 w-full md:w-auto md:rounded-r-3xl`}>
                      <div className="flex items-center justify-between md:justify-start md:flex-col">
                        <div className="flex items-center">
                          <Avatar 
                            icon={statusInfo.icon} 
                            size={44} 
                            className={statusInfo.avatarBg}
                          />
                          <div className="ml-3">
                            <div className={`text-lg font-medium ${statusInfo.textColor}`}>
                              {statusInfo.text}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {getTaskTypeName(task.task_type)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 md:p-6 flex-grow">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                        <div>
                          <div className="text-gray-500 text-xs mb-1 flex items-center">
                            <CalendarOutlined className="mr-1" /> 创建时间
                          </div>
                          <div className="text-sm">{format(new Date(task.created_at), 'yyyy-MM-dd HH:mm:ss')}</div>
                        </div>
                        
                        <div>
                          <div className="text-gray-500 text-xs mb-1 flex items-center">
                            <CalendarOutlined className="mr-1" /> 更新时间
                          </div>
                          <div className="text-sm">{format(new Date(task.updated_at), 'yyyy-MM-dd HH:mm:ss')}</div>
                        </div>
                        
                        <div>
                          <div className="text-gray-500 text-xs mb-1 flex items-center">
                            <UserOutlined className="mr-1" /> 用户ID
                          </div>
                          <div className="text-sm">{task.user_id}</div>
                        </div>
                        
                        <div>
                          <div className="text-gray-500 text-xs mb-1 flex items-center">
                            <InfoCircleOutlined className="mr-1" /> 任务ID
                          </div>
                          <div className="text-sm font-mono">{task.id}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 基本信息 - 移动端 */}
              {isMobile && (
                <div className="mb-6 grid grid-cols-2 gap-y-5">
                  <div>
                    <div className="text-gray-400 text-xs mb-1">创建时间</div>
                    <div className="text-sm text-gray-900">{format(new Date(task.created_at), 'yyyy-MM-dd HH:mm')}</div>
                  </div>
                  
                  <div>
                    <div className="text-gray-400 text-xs mb-1">更新时间</div>
                    <div className="text-sm text-gray-900">{format(new Date(task.updated_at), 'yyyy-MM-dd HH:mm')}</div>
                  </div>
                  
                  <div>
                    <div className="text-gray-400 text-xs mb-1">用户ID</div>
                    <div className="text-sm text-gray-900">{task.user_id}</div>
                  </div>
                  
                  <div>
                    <div className="text-gray-400 text-xs mb-1">任务ID</div>
                    <div className="text-sm text-gray-900 font-mono">{task.id}</div>
                  </div>
                </div>
              )}

              {/* 任务参数 - 移动端简约风格 */}
              {task.params && isMobile && (
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-3">
                    <div className="text-base font-medium flex items-center">
                      <div className="w-1 h-5 bg-blue-500 rounded-full mr-2"></div>
                      任务参数
                    </div>
                    <Button
                      type="text"
                      icon={<CopyOutlined />}
                      onClick={() => handleCopy(task.params)}
                      size="small"
                      className="text-gray-400 p-0"
                    />
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-words text-gray-700 leading-relaxed">
                      {formatJson(task.params)}
                    </pre>
                  </div>
                </div>
              )}

              {/* 任务结果 - 移动端简约风格 */}
              {task.result && isMobile && (
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-3">
                    <div className="text-base font-medium flex items-center">
                      <div className="w-1 h-5 bg-green-500 rounded-full mr-2"></div>
                      任务结果
                    </div>
                    <Button
                      type="text"
                      icon={<CopyOutlined />}
                      onClick={() => handleCopy(task.result)}
                      size="small"
                      className="text-gray-400 p-0"
                    />
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-words text-gray-700 leading-relaxed">
                      {formatJson(task.result)}
                    </pre>
                  </div>
                </div>
              )}

              {/* 任务参数 - 桌面端 */}
              {task.params && !isMobile && (
                <Card 
                  title={
                    <div className="flex items-center">
                      <CodeOutlined className="mr-2 text-blue-500" /> 
                      <span>任务参数</span>
                    </div>
                  }
                  extra={
                    <Button type="link" icon={<CopyOutlined />} onClick={() => handleCopy(task.params)}>
                      复制
                    </Button>
                  }
                  className="mb-5 rounded-xl overflow-hidden shadow-sm border-gray-100"
                >
                  <div className="overflow-x-auto">
                    <pre className="bg-gray-50 p-3 rounded-lg text-xs font-mono">
                      {formatJson(task.params)}
                    </pre>
                  </div>
                </Card>
              )}

              {/* 任务结果 - 桌面端 */}
              {task.result && !isMobile && (
                <Card 
                  title={
                    <div className="flex items-center">
                      <FileTextOutlined className="mr-2 text-green-500" /> 
                      <span>任务结果</span>
                    </div>
                  }
                  extra={
                    <Button type="link" icon={<CopyOutlined />} onClick={() => handleCopy(task.result)}>
                      复制
                    </Button>
                  }
                  className="mb-5 rounded-xl overflow-hidden shadow-sm border-gray-100"
                >
                  <div className="overflow-x-auto">
                    <pre className="bg-gray-50 p-3 rounded-lg text-xs font-mono">
                      {formatJson(task.result)}
                    </pre>
                  </div>
                </Card>
              )}

              {/* 错误信息 */}
              {task.error && (
                <div className={isMobile ? "mb-8" : "mb-5"}>
                  {!isMobile && (
                    <Card 
                      title={
                        <div className="flex items-center">
                          <CloseCircleOutlined className="mr-2 text-red-500" /> 
                          <span>错误信息</span>
                        </div>
                      }
                      className="rounded-xl overflow-hidden shadow-sm border-gray-100"
                    >
                      <div className="p-4">
                        <Alert
                          message="任务执行失败"
                          description={
                            <div className="overflow-x-auto mt-2">
                              <pre className="bg-red-50 p-3 rounded-lg text-xs font-mono text-red-600 whitespace-pre-wrap break-words">
                                {task.error}
                              </pre>
                            </div>
                          }
                          type="error"
                          showIcon
                          className="border border-red-100 rounded-lg"
                        />
                      </div>
                    </Card>
                  )}
                  {isMobile && (
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <div className="text-base font-medium flex items-center">
                          <div className="w-1 h-5 bg-red-500 rounded-full mr-2"></div>
                          错误信息
                        </div>
                      </div>
                      <Alert
                        message="任务执行失败"
                        description={
                          <div className="overflow-x-auto mt-2">
                            <pre className="bg-red-50 p-3 rounded-lg text-xs font-mono text-red-600 whitespace-pre-wrap break-words">
                              {task.error}
                            </pre>
                          </div>
                        }
                        type="error"
                        showIcon
                        className="border border-red-100 rounded-lg"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Result
              status="404"
              title="任务不存在"
              subTitle="该任务可能已被删除或尚未创建"
              className={`${isMobile ? 'mt-10' : 'mt-4 rounded-xl bg-white shadow-sm border border-gray-100'}`}
              extra={
                <Button 
                  type="primary" 
                  onClick={() => router.push('/tasks')}
                  className="rounded-lg"
                >
                  返回任务列表
                </Button>
              }
            />
          )}
        </div>
      </ConfigProvider>
    </Layout>
  );
};

export default TaskDetailPage; 