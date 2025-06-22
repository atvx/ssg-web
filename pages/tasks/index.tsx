import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { tasksAPI, salesAPI } from '@/lib/api';
import { Task } from '@/types/api';
import { 
  Spin, 
  Modal, 
  message, 
  Table, 
  Button, 
  Alert, 
  Tag, 
  Space, 
  Typography,
  ConfigProvider,
  Form,
  DatePicker,
  Select
} from 'antd';
import { 
  ExclamationCircleOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  ClockCircleOutlined, 
  DeleteOutlined, 
  EyeOutlined,
  SyncOutlined,
  PlusOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

// 设置 dayjs 为中文
dayjs.locale('zh-cn');

const { confirm } = Modal;
const { Title, Text } = Typography;
const { Option } = Select;

const TasksPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executingTaskIds, setExecutingTaskIds] = useState<number[]>([]);
  
  // 创建任务相关状态
  const [createTaskModalVisible, setCreateTaskModalVisible] = useState(false);
  const [createTaskForm] = Form.useForm();
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  // 如果用户未登录，重定向到登录页
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // 获取任务列表
  const fetchTasks = async () => {
    if (isAuthenticated) {
      try {
        setIsLoadingTasks(true);
        setError(null);
        const response = await tasksAPI.getTasks();
        if (response.data.success && response.data.data) {
          setTasks(response.data.data as Task[]);
        } else {
          setError('获取任务列表失败');
        }
      } catch (err) {
        setError('获取任务列表失败，请稍后再试');
      } finally {
        setIsLoadingTasks(false);
      }
    }
  };

  // 首次加载获取任务列表
  useEffect(() => {
    if (isAuthenticated) {
      fetchTasks();
    }
  }, [isAuthenticated]);

  // 删除任务
  const handleDeleteTask = async (taskId: number) => {
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
            // 从列表中移除已删除的任务
            setTasks(tasks.filter(task => task.id !== taskId));
            message.success('任务删除成功');
          } else {
            message.error(response.data.message || '删除任务失败');
          }
        } catch (err) {
          message.error('删除任务失败，请稍后再试');
        }
      }
    });
  };

  // 执行任务
  const handleExecuteTask = async (taskId: number) => {
    try {
      setExecutingTaskIds(prev => [...prev, taskId]);
      
      // 调用执行任务API
      const response = await tasksAPI.executeTask(taskId);
      
      if (response.data.success) {
        message.success('任务执行请求已发送');
        // 延迟几秒后刷新任务列表
        setTimeout(() => {
          fetchTasks();
        }, 2000);
      } else {
        message.error(response.data.message || '执行任务失败');
      }
    } catch (error) {
      message.error('执行任务请求失败，请稍后再试');
    } finally {
      setExecutingTaskIds(prev => prev.filter(id => id !== taskId));
    }
  };

  // 刷新任务列表
  const handleRefresh = () => {
    fetchTasks();
  };

  // 处理创建任务按钮点击
  const handleCreateTaskClick = () => {
    // 重置表单
    createTaskForm.resetFields();
    // 默认设置为今天日期
    createTaskForm.setFieldsValue({
      date: dayjs(),
      platform: 'all'
    });
    // 显示创建任务对话框
    setCreateTaskModalVisible(true);
  };

  // 处理创建任务提交
  const handleCreateTaskSubmit = async (values: any) => {
    try {
      setIsCreatingTask(true);
      
      // 构造同步参数
      const params: any = {
        sync: false
      };
      
      if (values.date) {
        params.date = format(values.date.toDate(), 'yyyy-MM-dd');
      }
      
      if (values.platform && values.platform !== 'all') {
        params.platform = values.platform;
      }
      
      // 调用创建任务API
      const response = await salesAPI.fetchData(params);
      
      if (response.data.success) {
        message.success('任务创建成功，请稍后刷新查看结果');
        setCreateTaskModalVisible(false);
        // 延迟几秒后刷新任务列表
        setTimeout(() => {
          handleRefresh();
        }, 3000);
      } else {
        message.error(response.data.message || '创建任务失败');
      }
    } catch (error) {
      message.error('创建任务请求失败，请稍后再试');
    } finally {
      setIsCreatingTask(false);
    }
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

  // 表格列定义
  const columns: ColumnsType<Task> = [
    {
      title: '任务类型',
      dataIndex: 'task_type',
      key: 'task_type',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => format(new Date(text), 'yyyy-MM-dd HH:mm:ss'),
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (text) => format(new Date(text), 'yyyy-MM-dd HH:mm:ss'),
      sorter: (a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
    },
    {
      title: '操作',
      key: 'action',
      align: 'right',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="link" 
            icon={<PlayCircleOutlined />} 
            onClick={() => handleExecuteTask(record.id)}
            loading={executingTaskIds.includes(record.id)}
            disabled={['running', 'processing'].includes(record.status)}
          >
            执行
          </Button>
          <Button 
            type="link" 
            icon={<EyeOutlined />} 
            onClick={() => router.push(`/tasks/${record.id}`)}
          >
            详情
          </Button>
          <Button 
            type="link" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => handleDeleteTask(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Spin size="large" /></div>;
  }

  if (!isAuthenticated) {
    return null; // 等待重定向
  }

  return (
    <Layout>
      <Head>
        <title>任务中心 | 销售助手</title>
        <meta name="description" content="查看和管理异步任务" />
      </Head>

      <ConfigProvider locale={zhCN}>
        <div className="py-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <Title level={2} style={{ margin: 0 }}>任务中心</Title>
              <Text type="secondary">查看和管理异步任务的状态和结果。</Text>
            </div>
            <Space>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={handleCreateTaskClick}
              >
                创建任务
              </Button>
              <Button 
                icon={<SyncOutlined />} 
                onClick={handleRefresh}
                loading={isLoadingTasks}
              >
                刷新
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

          {/* 任务列表 */}
          <Table
            columns={columns}
            dataSource={tasks}
            rowKey="id"
            loading={isLoadingTasks}
            pagination={{ 
              showSizeChanger: true, 
              pageSizeOptions: ['10', '20', '50'],
              showTotal: (total) => `共 ${total} 条记录`
            }}
            locale={{ emptyText: '暂无任务数据' }}
            className="bg-white shadow rounded-md"
          />
        </div>
      </ConfigProvider>

      {/* 创建任务对话框 */}
      <Modal
        title="创建任务"
        open={createTaskModalVisible}
        onCancel={() => setCreateTaskModalVisible(false)}
        footer={null}
      >
        <Form
          form={createTaskForm}
          layout="vertical"
          onFinish={handleCreateTaskSubmit}
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
            <Button onClick={() => setCreateTaskModalVisible(false)}>
              取消
            </Button>
            <Button type="primary" htmlType="submit" loading={isCreatingTask}>
              创建任务
            </Button>
          </div>
        </Form>
      </Modal>
    </Layout>
  );
};

export default TasksPage; 