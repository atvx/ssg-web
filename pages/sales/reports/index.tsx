import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { CalendarIcon, DocumentArrowDownIcon, PhotoIcon, DocumentTextIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { salesAPI } from '@/lib/api';

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
        } else {
          setError('数据同步失败：' + (response.data.message || '未知错误'));
          setSyncProgress(0);
        }
      } catch (err) {
        // 清除进度条定时器
        if (syncIntervalId) {
          clearInterval(syncIntervalId);
          setSyncIntervalId(null);
        }
        setError('数据同步失败，请稍后再试');
        setSyncProgress(0);
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
          } else {
            setError('导出报表成功，但未找到下载链接');
          }
        } else {
          setError('导出报表失败');
        }
      } catch (err) {
        setError('导出报表失败，请稍后再试');
      } finally {
        setIsExporting(false);
      }
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
        <title>报表中心 | 销售助手</title>
        <meta name="description" content="导出销售报表" />
      </Head>

      <div className="py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">报表中心</h1>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="btn btn-primary flex items-center"
          >
            <ArrowPathIcon className={`h-5 w-5 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? '同步中...' : '数据同步'}
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          导出销售报表，支持多种格式。
        </p>

        {/* 同步进度条 */}
        {isSyncing && (
          <div className="mt-4 bg-white p-4 rounded-md shadow">
            <div className="mb-2 flex justify-between">
              <span className="text-sm font-medium text-gray-700">数据同步中，请耐心等待...</span>
              <span className="text-sm text-gray-500">{Math.round(syncProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-primary-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
                style={{ width: `${syncProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* 同步结果 */}
        {syncResult && (
          <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            <div className="font-medium">数据同步成功</div>
            <div className="mt-2 text-sm">
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
          </div>
        )}

        {/* 日期选择 */}
        <div className="mt-6 bg-white p-6 rounded-md shadow">
          <div className="max-w-xl">
            <div className="mb-6">
              <label htmlFor="date" className="form-label flex items-center">
                <CalendarIcon className="h-5 w-5 mr-1 text-gray-400" />
                选择日期
              </label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="form-input mt-1"
              />
            </div>

            {/* 文件类型选择 */}
            <div className="mb-6">
              <label className="form-label">选择导出格式</label>
              <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div 
                  className={`relative rounded-lg border p-4 flex cursor-pointer focus:outline-none ${
                    selectedFileType === 'excel' 
                      ? 'bg-primary-50 border-primary-200' 
                      : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedFileType('excel')}
                >
                  <div className="flex-1 flex">
                    <div className="flex flex-col">
                      <DocumentTextIcon className="h-6 w-6 text-green-500" />
                      <span className="mt-2 text-sm font-medium text-gray-900">Excel</span>
                      <span className="mt-1 text-xs text-gray-500">导出为Excel表格</span>
                    </div>
                  </div>
                </div>
                <div 
                  className={`relative rounded-lg border p-4 flex cursor-pointer focus:outline-none ${
                    selectedFileType === 'pdf' 
                      ? 'bg-primary-50 border-primary-200' 
                      : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedFileType('pdf')}
                >
                  <div className="flex-1 flex">
                    <div className="flex flex-col">
                      <DocumentArrowDownIcon className="h-6 w-6 text-red-500" />
                      <span className="mt-2 text-sm font-medium text-gray-900">PDF</span>
                      <span className="mt-1 text-xs text-gray-500">导出为PDF文档</span>
                    </div>
                  </div>
                </div>
                <div 
                  className={`relative rounded-lg border p-4 flex cursor-pointer focus:outline-none ${
                    selectedFileType === 'png' 
                      ? 'bg-primary-50 border-primary-200' 
                      : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedFileType('png')}
                >
                  <div className="flex-1 flex">
                    <div className="flex flex-col">
                      <PhotoIcon className="h-6 w-6 text-blue-500" />
                      <span className="mt-2 text-sm font-medium text-gray-900">图片</span>
                      <span className="mt-1 text-xs text-gray-500">导出为PNG图片</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleExport(selectedFileType)}
              disabled={isExporting}
              className="btn btn-primary"
            >
              {isExporting ? '导出中...' : '导出报表'}
            </button>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* 导出结果 */}
        {exportedUrl && (
          <div className="mt-6 bg-white p-6 rounded-md shadow">
            <h2 className="text-lg font-medium text-gray-900">导出成功</h2>
            <div className="mt-4">
              <a 
                href={exportedUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                查看/下载报表
              </a>
            </div>
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
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SalesReportsPage; 