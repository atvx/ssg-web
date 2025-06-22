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
  Modal
} from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  ClockCircleOutlined, 
  DeleteOutlined, 
  ArrowLeftOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';

const { Title, Text, Paragraph } = Typography;
const { confirm } = Modal;

const TaskDetailPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const taskId = id ? parseInt(id as string) : undefined;
  
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

  // 获取任务状态标签
  const getStatusTag = (status: string) => {
    switch (status) {
      case 'completed':
        return <Tag icon={<CheckCircleOutlined />} color="success">已完成</Tag>;
      case 'failed':
        return <Tag icon={<CloseCircleOutlined />} color="error">失败</Tag>;
      case 'running':
        return <Tag icon={<SyncOutlined spin />} color="processing">运行中</Tag>;
      case 'pending':
        return <Tag icon={<ClockCircleOutlined />} color="warning">等待中</Tag>;
      case 'processing':
        return <Tag icon={<SyncOutlined spin />} color="processing">处理中</Tag>;
      default:
        return <Tag>{status}</Tag>;
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

  return (
    <Layout>
      <Head>
        <title>任务详情 | 销售助手</title>
        <meta name="description" content="查看任务详细信息" />
      </Head>

      <ConfigProvider locale={zhCN}>
        <div className="py-6">
          {/* 面包屑导航 */}
          <Breadcrumb className="mb-4">
            <Breadcrumb.Item>
              <a onClick={() => router.push('/tasks')}>任务中心</a>
            </Breadcrumb.Item>
            <Breadcrumb.Item>任务详情</Breadcrumb.Item>
          </Breadcrumb>

          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <Title level={2} style={{ margin: 0 }}>任务详情</Title>
            </div>
            <Space>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={handleRefresh}
                loading={isLoadingTask}
              >
                刷新
              </Button>
              <Button 
                danger 
                icon={<DeleteOutlined />} 
                onClick={handleDeleteTask}
              >
                删除
              </Button>
              <Button 
                icon={<ArrowLeftOutlined />} 
                onClick={() => router.push('/tasks')}
                style={{ marginRight: '16px' }}
              >
                返回
              </Button>
            </Space>
          </div>

          {/* 错误提示 */}
          {error && (
            <Alert 
              message={error} 
              type="error" 
              showIcon 
              className="mb-4" 
            />
          )}

          {/* 任务详情 */}
          {isLoadingTask ? (
            <div className="flex justify-center py-10">
              <Spin size="large" tip="加载中..." />
            </div>
          ) : task ? (
            <div>
              <Card className="mb-4">
                <Descriptions 
                  title="基本信息" 
                  bordered 
                  column={{ xxl: 3, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }}
                >
                  <Descriptions.Item label="任务ID">{task.id}</Descriptions.Item>
                  <Descriptions.Item label="用户ID">{task.user_id}</Descriptions.Item>
                  <Descriptions.Item label="任务类型">{task.task_type}</Descriptions.Item>
                  <Descriptions.Item label="状态">{getStatusTag(task.status)}</Descriptions.Item>
                  <Descriptions.Item label="进度">{task.progress !== undefined ? `${task.progress}%` : '无进度信息'}</Descriptions.Item>
                  <Descriptions.Item label="创建时间">
                    {format(new Date(task.created_at), 'yyyy-MM-dd HH:mm:ss')}
                  </Descriptions.Item>
                  <Descriptions.Item label="更新时间">
                    {format(new Date(task.updated_at), 'yyyy-MM-dd HH:mm:ss')}
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              {/* 任务参数 */}
              {task.params && (
                <Card title="任务参数" className="mb-4">
                  <pre className="bg-gray-50 p-4 rounded-md overflow-auto">
                    {formatJson(task.params)}
                  </pre>
                </Card>
              )}

              {/* 任务结果 */}
              {task.result && (
                <Card title="任务结果" className="mb-4">
                  <pre className="bg-gray-50 p-4 rounded-md overflow-auto">
                    {formatJson(task.result)}
                  </pre>
                </Card>
              )}

              {/* 错误信息 */}
              {task.error && (
                <Card title="错误信息" className="mb-4">
                  <Alert
                    message="任务执行失败"
                    description={
                      <pre className="mt-2 text-red-600 overflow-auto">
                        {task.error}
                      </pre>
                    }
                    type="error"
                    showIcon
                  />
                </Card>
              )}
            </div>
          ) : (
            <Result
              status="404"
              title="404"
              subTitle="任务不存在或已被删除"
              extra={
                <Button type="primary" onClick={() => router.push('/tasks')}>
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