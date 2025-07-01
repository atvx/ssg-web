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
  Empty
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
  CodeOutlined
} from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';

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
        <div className="py-4 md:py-6 px-2 md:px-6">
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

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-3">
            <div className="flex items-center">
              {isMobile && (
                <Button
                  type="default"
                  icon={<ArrowLeftOutlined />}
                  onClick={() => router.push('/tasks')}
                  size="middle"
                  className="mr-3 flex items-center justify-center rounded-lg"
                />
              )}
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
              {!isMobile && (
                <Button 
                  icon={<ArrowLeftOutlined />} 
                  onClick={() => router.push('/tasks')}
                  className="rounded-lg"
                >
                  返回
                </Button>
              )}
            </Space>
          </div>

          {/* 错误提示 */}
          {error && (
            <Alert 
              message={error} 
              type="error" 
              showIcon 
              className="mb-5 rounded-lg" 
            />
          )}

          {/* 任务详情 */}
          {isLoadingTask ? (
            <div className="flex flex-col justify-center items-center py-20">
              <Spin size="large" />
              <div className="mt-3 text-gray-500">加载任务信息...</div>
            </div>
          ) : task ? (
            <div>
              {/* 任务状态卡片 - 移动端和桌面端通用 */}
              <Card className="mb-5 rounded-xl overflow-hidden shadow-sm border-gray-100">
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
                            {task.task_type}
                          </div>
                        </div>
                      </div>
                      
                      {task.progress !== undefined && (
                        <div className="md:mt-3 md:self-start">
                          <Progress 
                            percent={task.progress} 
                            size="small" 
                            status={
                              task.status === 'failed' ? 'exception' : 
                              task.status === 'completed' ? 'success' : 'active'
                            }
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-4 md:p-6 flex-grow">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                      <div>
                        <div className="text-gray-500 text-xs mb-1 flex items-center">
                          <CalendarOutlined className="mr-1" /> 创建时间
                        </div>
                        <div className="text-sm">{format(new Date(task.created_at), isMobile ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd HH:mm:ss')}</div>
                      </div>
                      
                      <div>
                        <div className="text-gray-500 text-xs mb-1 flex items-center">
                          <CalendarOutlined className="mr-1" /> 更新时间
                        </div>
                        <div className="text-sm">{format(new Date(task.updated_at), isMobile ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd HH:mm:ss')}</div>
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
              </Card>

              {/* 任务参数 */}
              {task.params && (
                <Card 
                  title={
                    <div className="flex items-center">
                      <CodeOutlined className="mr-2 text-blue-500" /> 
                      <span>任务参数</span>
                    </div>
                  }
                  className="mb-5 rounded-xl overflow-hidden shadow-sm border-gray-100" 
                  styles={{ body: isMobile ? { padding: '12px' } : {} }}
                >
                  <div className="overflow-x-auto">
                    <pre className="bg-gray-50 p-3 rounded-lg text-xs font-mono">
                      {formatJson(task.params)}
                    </pre>
                  </div>
                </Card>
              )}

              {/* 任务结果 */}
              {task.result && (
                <Card 
                  title={
                    <div className="flex items-center">
                      <FileTextOutlined className="mr-2 text-green-500" /> 
                      <span>任务结果</span>
                    </div>
                  }
                  className="mb-5 rounded-xl overflow-hidden shadow-sm border-gray-100" 
                  styles={{ body: isMobile ? { padding: '12px' } : {} }}
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
                <Card 
                  title={
                    <div className="flex items-center">
                      <CloseCircleOutlined className="mr-2 text-red-500" /> 
                      <span>错误信息</span>
                    </div>
                  }
                  className="mb-5 rounded-xl overflow-hidden shadow-sm border-gray-100" 
                  styles={{ body: isMobile ? { padding: '12px' } : {} }}
                >
                  <Alert
                    message="任务执行失败"
                    description={
                      <div className="overflow-x-auto mt-2">
                        <pre className="bg-red-50 p-3 rounded-lg text-xs font-mono text-red-600">
                          {task.error}
                        </pre>
                      </div>
                    }
                    type="error"
                    showIcon
                    className="border border-red-100 rounded-lg"
                  />
                </Card>
              )}
            </div>
          ) : (
            <Result
              status="404"
              title="任务不存在"
              subTitle="该任务可能已被删除或尚未创建"
              className="rounded-xl bg-white shadow-sm border border-gray-100 mt-4"
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