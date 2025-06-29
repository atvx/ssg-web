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
  const [exportedFileName, setExportedFileName] = useState<string>('');
  const [selectedFileType, setSelectedFileType] = useState<FileType>('png');
  const [messageApi, contextHolder] = message.useMessage();
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const isMobile = useIsMobile();

  // 如果用户未登录，重定向到登录页
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // 导出报表
  const handleExport = async (fileType: FileType, isRetry: boolean = false) => {
    if (isAuthenticated) {
      try {
        setIsExporting(true);
        setError(null);
        setExportedUrl(null);
        setExportedFileName('');
        
        if (isRetry) {
          setIsRetrying(true);
          messageApi.loading('正在重试导出报表...', 2);
        } else {
          messageApi.loading('正在生成报表，请稍候...', 2);
          setRetryCount(0);
        }
        
        const response = await salesAPI.exportDailyReport({ 
          date,
          file_type: fileType
        });
        
        if (response.data.success && response.data.data && response.data.data.files) {
          // 根据文件类型获取对应的URL
          let url: string | undefined;
          switch (fileType) {
            case 'excel':
              url = response.data.data.files.excel_url;
              break;
            case 'pdf':
              url = response.data.data.files.pdf_url;
              break;
            case 'png':
              url = response.data.data.files.img_url;
              break;
          }
                     
          if (url) {
            // 从URL中提取文件名，如果失败则使用默认名称
            const urlParts = url.split('/');
            const originalFileName = urlParts[urlParts.length - 1] || `销售报表_${date}.${fileType === 'png' ? 'png' : fileType === 'pdf' ? 'pdf' : 'xlsx'}`;
            
            // 保存导出结果
            setExportedUrl(url);
            setExportedFileName(originalFileName);
            
            messageApi.success(`${fileType.toUpperCase()}报表导出成功！`);
            setRetryCount(0);
          } else {
            setError(`导出报表成功，但未找到${fileType.toUpperCase()}文件下载链接`);
            messageApi.warning(`导出报表成功，但未找到${fileType.toUpperCase()}文件下载链接`);
          }
        } else {
          const errorMsg = response.data.message || '导出报表失败';
          setError(errorMsg);
          messageApi.error(errorMsg);
        }
      } catch (err: any) {
        console.error('导出报表错误:', err);
        
        let errorMessage = '导出报表失败，请稍后再试';
        let canRetry = true;
        
        // 根据错误类型提供更具体的信息
        if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
          errorMessage = `服务器处理超时，${fileType.toUpperCase()}文件生成可能需要更长时间，请稍后重试`;
        } else if (err.response) {
          const status = err.response.status;
          const responseData = err.response.data;
          
          switch (status) {
            case 504:
              errorMessage = `网关超时(504)，${fileType.toUpperCase()}文件生成时间较长，请稍后重试`;
              break;
            case 503:
              errorMessage = '服务暂时不可用(503)，请稍后重试';
              break;
            case 500:
              errorMessage = '服务器内部错误(500)，请联系管理员或稍后重试';
              break;
            case 422:
              errorMessage = responseData?.message || '请求参数错误，请检查日期格式';
              canRetry = false;
              break;
            case 401:
              errorMessage = '登录已过期，请重新登录';
              canRetry = false;
              break;
            default:
              errorMessage = responseData?.message || `请求失败(${status})，请稍后重试`;
          }
        } else if (err.request) {
          errorMessage = '网络连接失败，请检查网络连接后重试';
        }
        
        setError(errorMessage);
        messageApi.error(errorMessage);
        
        if (canRetry && !isRetry) {
          setRetryCount(prev => prev + 1);
        }
      } finally {
        setIsExporting(false);
        setIsRetrying(false);
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

  // 重试导出
  const handleRetry = () => {
    handleExport(selectedFileType, true);
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
                      className="w-full rounded-lg py-2 px-3 text-center"
                      style={{ 
                        height: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px'
                      }}
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

              {/* 格式说明 */}
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-2">格式说明：</p>
                <div className="space-y-1 text-xs text-gray-500">
                  <div>• <span className="font-medium text-green-600">Excel</span>：完整数据表格（生成时间较长）</div>
                  <div>• <span className="font-medium text-red-600">PDF</span>：适合打印和分享的正式报表文档</div>
                  <div>• <span className="font-medium text-blue-600">图片</span>：快速预览，便于分享和查看（推荐）</div>
                </div>
              </div>

              <Button
                type="primary"
                onClick={() => handleExport(selectedFileType)}
                loading={isExporting}
                size="large"
                className="mt-2 rounded-lg h-12"
                block
                disabled={isExporting}
              >
                {isExporting 
                  ? (isRetrying ? '重试中...' : '导出中...') 
                  : '导出报表'
                }
              </Button>
              

            </div>
          </ConfigProvider>
        </Card>

        {/* 错误提示 */}
        {error && (
          <Card className="mt-6 shadow-md rounded-xl border-red-200">
            <Alert 
              message="导出失败" 
              description={
                <div>
                  <p className="mb-3">{error}</p>
                  {retryCount > 0 && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button 
                        type="primary" 
                        size="small"
                        onClick={handleRetry}
                        loading={isRetrying}
                        className="rounded-lg"
                      >
                        {isRetrying ? '重试中...' : '重试'}
                      </Button>
                      <span className="text-gray-500 text-sm self-center">
                        提示：Excel文件生成通常需要更长时间，建议稍后重试
                      </span>
                    </div>
                  )}
                </div>
              }
              type="error" 
              showIcon 
              className="border-red-200"
            />
          </Card>
        )}

        {/* 导出结果 */}
        {exportedUrl && exportedFileName && (
          <Card className="mt-6 shadow-md rounded-xl border-green-200 bg-green-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-green-800 mb-2">导出成功</h2>
                <p className="text-sm text-green-600 mb-3">
                  {selectedFileType.toUpperCase()}文件已准备就绪，点击下载链接即可保存到本地
                </p>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 flex items-center justify-center mr-3 rounded-lg bg-green-100">
                    {selectedFileType === 'excel' && (
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                    {selectedFileType === 'pdf' && (
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    )}
                    {selectedFileType === 'png' && (
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{exportedFileName}</p>
                    <p className="text-sm text-gray-500">
                      {selectedFileType === 'excel' && 'Excel数据表格'}
                      {selectedFileType === 'pdf' && 'PDF文档'}
                      {selectedFileType === 'png' && 'PNG图片'}
                    </p>
                  </div>
                </div>
                
                <Button 
                  type="primary"
                  href={exportedUrl} 
                  download={exportedFileName}
                  className="rounded-lg"
                  icon={<DocumentArrowDownIcon className="w-4 h-4" />}
                >
                  下载
                </Button>
              </div>
            </div>
          </Card>
        )}

      </div>
    </Layout>
  );
};

export default SalesReportsPage; 