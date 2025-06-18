import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { CalendarIcon, DocumentArrowDownIcon, PhotoIcon, DocumentTextIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { salesAPI } from '@/lib/api';
import { Button, DatePicker, Progress, Card, Alert, Space, ConfigProvider, Radio, Spin, message } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import type { RadioChangeEvent } from 'antd';
import dayjs from 'dayjs';

type FileType = 'excel' | 'pdf' | 'png';

const SalesReportsPage: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isExporting, setIsExporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportedUrl, setExportedUrl] = useState<string | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<FileType>('png');
  const [syncIntervalId, setSyncIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  // 如果用户未登录，重定向到登录页
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // 组件卸载时清除定时器
  useEffect(() => {
    return () => {
      if (syncIntervalId) {
        clearInterval(syncIntervalId);
      }
    };
  }, [syncIntervalId]);

  // 数据同步
  const handleSync = async () => {
    if (isAuthenticated && user) {
      try {
        setIsSyncing(true);
        setSyncProgress(0);
        setError(null);
        setSyncResult(null);
        
        // 启动模拟进度条
        const interval = setInterval(() => {
          setSyncProgress(prev => {
            // 模拟进度，最多到95%，剩余5%留给实际完成时
            const nextProgress = prev + (Math.random() * 2);
            return nextProgress >= 95 ? 95 : nextProgress;
          });
        }, 1000);
        
        setSyncIntervalId(interval);
        
        // 发起同步请求
        const response = await salesAPI.fetchData({
          date,
          sync: true,
          user_id: user.id
        });
        
        // 清除进度条定时器
        clearInterval(interval);
        setSyncIntervalId(null);
        
        if (response.data.success && response.data.data) {
          setSyncResult(response.data.data);
          setSyncProgress(100);
          messageApi.success('数据同步成功');
        } else {
          const errorMsg = '数据同步失败：' + (response.data.message || '未知错误');
          setError(errorMsg);
          setSyncProgress(0);
          messageApi.error(errorMsg);
        }
      } catch (err) {
        // 清除进度条定时器
        if (syncIntervalId) {
          clearInterval(syncIntervalId);
          setSyncIntervalId(null);
        }
        setError('数据同步失败，请稍后再试');
        setSyncProgress(0);
        messageApi.error('数据同步失败，请稍后再试');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // 导出报表
  const handleExport = async (fileType: FileType) => {
    if (isAuthenticated) {
      try {
        setIsExporting(true);
        setError(null);
        setExportedUrl(null);
        
        const response = await salesAPI.exportDailyReport({ 
          date,
          file_type: fileType
        });
        
        if (response.data.success && response.data.data) {
          // 修复：正确解析返回的URL字段
          const url = response.data.data.files?.img_url || 
                     response.data.data.files?.pdf_url || 
                     response.data.data.files?.excel_url ||
                     response.data.data.url;  // 兼容旧格式
                     
          if (url) {
            setExportedUrl(url);
            messageApi.success('导出报表成功');
          } else {
            setError('导出报表成功，但未找到下载链接');
            messageApi.warning('导出报表成功，但未找到下载链接');
          }
        } else {
          setError('导出报表失败');
          messageApi.error('导出报表失败');
        }
      } catch (err) {
        setError('导出报表失败，请稍后再试');
        messageApi.error('导出报表失败，请稍后再试');
      } finally {
        setIsExporting(false);
      }
    }
  };

  const handleDateChange = (date: dayjs.Dayjs | null) => {
    if (date) {
      setDate(date.format('YYYY-MM-DD'));
    }
  };

  const handleFileTypeChange = (fileType: FileType) => {
    setSelectedFileType(fileType);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // 等待重定向
  }

  return (
    <Layout>
      {contextHolder}
      <Head>
        <title>报表中心 | 销售助手</title>
        <meta name="description" content="导出销售报表" />
      </Head>

      <div className="py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">报表中心</h1>
          <Button
            type="primary"
            icon={<ArrowPathIcon className={`h-5 w-5 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />}
            onClick={handleSync}
            loading={isSyncing}
          >
            {isSyncing ? '同步中...' : '数据同步'}
          </Button>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          导出销售报表，支持多种格式。
        </p>

        {/* 同步进度条 */}
        {isSyncing && (
          <Card className="mt-4">
            <div className="mb-2 flex justify-between">
              <span className="text-sm text-gray-700">数据同步中，请耐心等待...</span>
              <span className="text-sm text-gray-500">{Math.round(syncProgress)}%</span>
            </div>
            <Progress percent={syncProgress} status="active" strokeColor="#1890ff" />
          </Card>
        )}

        {/* 同步结果 */}
        {syncResult && (
          <Alert
            message="数据同步成功"
            description={
              <div className="text-sm">
                <p>日期: {syncResult.date}</p>
                <p>执行模式: {syncResult.execution_mode === 'sync' ? '同步' : '异步'}</p>
                {syncResult.platforms && (
                  <div className="mt-2">
                    <p className="font-medium">平台数据:</p>
                    <ul className="list-disc list-inside pl-2">
                      {Object.keys(syncResult.platforms).map(platform => (
                        <li key={platform}>
                          {platform}: {syncResult.platforms[platform].message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {syncResult.target_update && (
                  <p className="mt-2">目标更新: {syncResult.target_update.message}</p>
                )}
              </div>
            }
            type="success"
            showIcon
            className="mt-4"
          />
        )}

        {/* 表单区域 */}
        <Card className="mt-6">
          <ConfigProvider locale={zhCN}>
            <div className="max-w-xl">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <CalendarIcon className="h-5 w-5 inline-block mr-1 text-gray-400" />
                  选择日期
                </label>
                <DatePicker 
                  value={dayjs(date)}
                  onChange={handleDateChange}
                  className="w-full"
                />
              </div>

              {/* 文件类型选择 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">选择导出格式</label>
                <div className="flex flex-wrap gap-4">
                  <div
                    className={`cursor-pointer border rounded-md p-4 flex flex-col items-center w-24 transition-all ${
                      selectedFileType === 'excel'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleFileTypeChange('excel')}
                  >
                    <div className="w-12 h-12 flex items-center justify-center text-green-500 mb-2 bg-green-50 rounded-md">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span className="text-gray-900 font-medium">Excel</span>
                  </div>
                  
                  <div
                    className={`cursor-pointer border rounded-md p-4 flex flex-col items-center w-24 transition-all ${
                      selectedFileType === 'pdf'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleFileTypeChange('pdf')}
                  >
                    <div className="w-12 h-12 flex items-center justify-center text-red-500 mb-2 bg-red-50 rounded-md">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-gray-900 font-medium">PDF</span>
                  </div>
                  
                  <div
                    className={`cursor-pointer border rounded-md p-4 flex flex-col items-center w-24 transition-all ${
                      selectedFileType === 'png'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleFileTypeChange('png')}
                  >
                    <div className="w-12 h-12 flex items-center justify-center text-blue-500 mb-2 bg-blue-50 rounded-md">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-gray-900 font-medium">图片</span>
                  </div>
                </div>
              </div>

              <Button
                type="primary"
                onClick={() => handleExport(selectedFileType)}
                loading={isExporting}
                size="large"
                className="mt-2"
                block
              >
                导出报表
              </Button>
            </div>
          </ConfigProvider>
        </Card>

        {/* 错误提示 */}
        {error && (
          <Alert message={error} type="error" showIcon className="mt-4" />
        )}

        {/* 导出结果 */}
        {exportedUrl && (
          <Card className="mt-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">导出成功</h2>
            <Button 
              type="primary"
              href={exportedUrl} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              查看/下载报表
            </Button>
            
            {selectedFileType === 'png' && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-2">预览</h3>
                <img 
                  src={exportedUrl} 
                  alt="报表预览" 
                  className="max-w-full h-auto border rounded-md"
                />
              </div>
            )}
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default SalesReportsPage; 