import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { CheckCircleIcon, XCircleIcon, ClockIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { tasksAPI } from '@/lib/api';
import { Task } from '@/types/api';

const TasksPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 如果用户未登录，重定向到登录页
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
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
    if (!window.confirm('确定要删除此任务吗？')) {
      return;
    }

    try {
      const response = await tasksAPI.deleteTask(taskId);
      if (response.data.success) {
        // 从列表中移除已删除的任务
        setTasks(tasks.filter(task => task.id !== taskId));
      } else {
        setError('删除任务失败');
      }
    } catch (err) {
      setError('删除任务失败，请稍后再试');
    }
  };

  // 获取任务状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'pending':
      case 'processing':
      default:
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  // 获取任务状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'failed':
        return '失败';
      case 'pending':
        return '等待中';
      case 'processing':
        return '处理中';
      default:
        return status;
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
        <title>任务中心 | 销售助手</title>
        <meta name="description" content="查看和管理异步任务" />
      </Head>

      <div className="py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">任务中心</h1>
          <button
            onClick={fetchTasks}
            className="btn btn-outline"
            disabled={isLoadingTasks}
          >
            {isLoadingTasks ? '刷新中...' : '刷新'}
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          查看和管理异步任务的状态和结果。
        </p>

        {/* 错误提示 */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* 任务列表 */}
        <div className="mt-6 bg-white shadow overflow-hidden rounded-md">
          {isLoadingTasks ? (
            <div className="p-4 text-center">加载中...</div>
          ) : tasks.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    任务类型
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    创建时间
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    更新时间
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {task.task_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(task.status)}
                        <span className="ml-1.5 text-sm text-gray-900">
                          {getStatusText(task.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(task.created_at), 'yyyy-MM-dd HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(task.updated_at), 'yyyy-MM-dd HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => router.push(`/tasks/${task.id}`)}
                        className="text-primary-600 hover:text-primary-900 mr-4"
                      >
                        详情
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-4 text-center text-gray-500">暂无任务数据</div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default TasksPage; 