import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { CalendarIcon, DocumentArrowDownIcon, PhotoIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { salesAPI } from '@/lib/api';
import { Button, DatePicker, Card, Alert, Space, ConfigProvider, Radio, Spin, message, Input } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import type { RadioChangeEvent } from 'antd';
import dayjs from 'dayjs';

type FileType = 'excel' | 'pdf' | 'png';

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

const SalesReportsPage: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportedUrl, setExportedUrl] = useState<string | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<FileType>('png');
  const [messageApi, contextHolder] = message.useMessage();
  const isMobile = useIsMobile();

  // 如果用户未登录，重定向到登录页
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

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
          const url = response.data.data.files?.img_url || 
                     response.data.data.files?.pdf_url || 
                     response.data.data.files?.excel_url ||
                     response.data.data.url;
                     
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

  // 处理移动端日期输入
  const handleMobileDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // 简单验证日期格式 YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(inputValue)) {
      const dateObj = dayjs(inputValue);
      if (dateObj.isValid()) {
        setDate(inputValue);
      }
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

      <div className={`py-6 ${isMobile ? 'px-3' : 'px-6'}`}>
        <div className="flex justify-between items-center">
          <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-semibold text-gray-900`}>报表中心</h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          导出销售报表，支持多种格式。
        </p>

        {/* 表单区域 */}
        <Card className="mt-6 shadow-md rounded-xl">
          <ConfigProvider locale={zhCN}>
            <div className="max-w-xl">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <CalendarIcon className="h-5 w-5 inline-block mr-1 text-gray-400" />
                  选择日期
                </label>
                
                {isMobile ? (
                  <div className="relative">
                    <Input
                      type="date"
                      value={date}
                      onChange={handleMobileDateInput}
                      className="w-full rounded-lg py-2 px-3"
                      style={{ height: '40px' }}
                    />
                  </div>
                ) : (
                  <DatePicker 
                    value={dayjs(date)}
                    onChange={handleDateChange}
                    className="w-full"
                  />
                )}
              </div>

              {/* 文件类型选择 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">选择导出格式</label>
                <div className="flex flex-wrap gap-3">
                  <div
                    className={`cursor-pointer border rounded-lg p-3 flex flex-col items-center ${isMobile ? 'w-[30%]' : 'w-24'} transition-all ${
                      selectedFileType === 'excel'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleFileTypeChange('excel')}
                  >
                    <div className="w-10 h-10 flex items-center justify-center text-green-500 mb-2 bg-green-50 rounded-md">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span className="text-gray-900 font-medium text-sm">Excel</span>
                  </div>
                  
                  <div
                    className={`cursor-pointer border rounded-lg p-3 flex flex-col items-center ${isMobile ? 'w-[30%]' : 'w-24'} transition-all ${
                      selectedFileType === 'pdf'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleFileTypeChange('pdf')}
                  >
                    <div className="w-10 h-10 flex items-center justify-center text-red-500 mb-2 bg-red-50 rounded-md">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-gray-900 font-medium text-sm">PDF</span>
                  </div>
                  
                  <div
                    className={`cursor-pointer border rounded-lg p-3 flex flex-col items-center ${isMobile ? 'w-[30%]' : 'w-24'} transition-all ${
                      selectedFileType === 'png'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleFileTypeChange('png')}
                  >
                    <div className="w-10 h-10 flex items-center justify-center text-blue-500 mb-2 bg-blue-50 rounded-md">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-gray-900 font-medium text-sm">图片</span>
                  </div>
                </div>
              </div>

              <Button
                type="primary"
                onClick={() => handleExport(selectedFileType)}
                loading={isExporting}
                size="large"
                className="mt-2 rounded-lg h-12"
                block
              >
                导出报表
              </Button>
            </div>
          </ConfigProvider>
        </Card>

        {/* 错误提示 */}
        {error && (
          <Alert message={error} type="error" showIcon className="mt-4 rounded-lg" />
        )}

        {/* 导出结果 */}
        {exportedUrl && (
          <Card className="mt-6 shadow-md rounded-xl">
            <h2 className="text-lg font-medium text-gray-900 mb-4">导出成功</h2>
            <Button 
              type="primary"
              href={exportedUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="rounded-lg"
            >
              查看/下载报表
            </Button>
            
            {selectedFileType === 'png' && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-2">预览</h3>
                <img 
                  src={exportedUrl} 
                  alt="报表预览" 
                  className="max-w-full h-auto border rounded-lg shadow-sm"
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