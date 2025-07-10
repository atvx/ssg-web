import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import SalesCharts from '@/components/sales/SalesCharts';
import DailyReportContent from '@/components/sales/DailyReportContent';
import MonthlySalesCharts from '@/components/sales/MonthlySalesCharts';
import { Spin, Tabs, DatePicker, Button, Tooltip, message, Modal, Select, Radio } from 'antd';
import type { TabsProps } from 'antd';
import { CloudUploadOutlined, SyncOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import zhCN from 'antd/lib/date-picker/locale/zh_CN';
import ExcelJS from 'exceljs';
import apiClient from '@/lib/api';

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

const SalesChartsPage: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [exporting, setExporting] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncModalVisible, setSyncModalVisible] = useState<boolean>(false);
  const [syncPlatform, setSyncPlatform] = useState<string>('all');
  const [syncType, setSyncType] = useState<boolean>(true); // true=同步, false=异步
  const [syncDate, setSyncDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const isMobile = useIsMobile();
  
  // 长按相关状态
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pressStartTimeRef = useRef<number>(0);

  // 设置dayjs使用中文语言环境
  dayjs.locale('zh-cn');

  // 如果用户未登录，重定向到登录页
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const tabItems: TabsProps['items'] = [
    {
      key: 'daily',
      label: '日',
      children: <DailyReportContent selectedDate={selectedDate} />,
    },
    {
      key: 'weekly',
      label: '周',
      children: <SalesCharts className="mt-4" selectedDate={selectedDate} />,
    },
    {
      key: 'monthly',
      label: '月',
      children: <MonthlySalesCharts className="mt-4" selectedDate={selectedDate} />,
    },
  ];

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const handleDateChange = (date: dayjs.Dayjs | null) => {
    if (date) {
      setSelectedDate(date.format('YYYY-MM-DD'));
    }
  };

  // 数据同步函数
  const performSync = async (isSync: boolean, platform: string, date: string) => {
    if (!user?.id) {
      message.error('用户信息不完整');
      return;
    }

    try {
      setSyncing(true);
      
      // 构建请求参数，当平台为 "all" 时不传递 platform 参数
      const params: any = {
        sync: isSync,
        user_id: user.id,
        date: date
      };
      
      // 只有当平台不是 "all" 时才传递 platform 参数
      if (platform !== 'all') {
        params.platform = platform;
      }
      
      const response = await apiClient.get('/api/sales/fetch', {
        params
      });

      if (response.data.success) {
        message.success(isSync ? '同步数据成功' : '异步任务已创建');
      } else {
        message.error(response.data.message || '同步失败');
      }
    } catch (error) {
      message.error('同步失败：' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setSyncing(false);
    }
  };

  // 处理同步按钮的鼠标按下事件
  const handleSyncMouseDown = () => {
    pressStartTimeRef.current = Date.now();
    pressTimerRef.current = setTimeout(() => {
      // 长按：显示设置弹窗
      setSyncModalVisible(true);
    }, 500); // 500ms后触发长按
  };

  // 处理同步按钮的鼠标抬起事件
  const handleSyncMouseUp = () => {
    const pressDuration = Date.now() - pressStartTimeRef.current;
    
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }

    // 短按：直接同步
    if (pressDuration < 500) {
      performSync(true, 'all', selectedDate);
    }
  };

  // 处理鼠标离开事件（取消长按）
  const handleSyncMouseLeave = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  // 确认同步设置
  const handleSyncConfirm = () => {
    setSyncModalVisible(false);
    performSync(syncType, syncPlatform, syncDate);
  };

  // 取消同步设置
  const handleSyncCancel = () => {
    setSyncModalVisible(false);
  };

  // 处理同步日期变化
  const handleSyncDateChange = (date: dayjs.Dayjs | null) => {
    if (date) {
      setSyncDate(date.format('YYYY-MM-DD'));
    }
  };

  // 导出数据函数
  const handleExport = async () => {
    if (exporting) return;
    
    try {
      setExporting(true);
      
      // 获取日报表数据
      const response = await apiClient.get('/api/report/daily', {
        params: {
          query_date: selectedDate
        }
      });
      
      if (!response.data.success) {
        throw new Error(response.data.message || '获取数据失败');
      }

      // 过滤并处理数据
      const rawData = response.data.data
        .filter((item: any) => item.status !== 0 && item.sold_car_count > 0)
        .sort((a: any, b: any) => {
          if (a.p_sort !== b.p_sort) {
            return a.p_sort - b.p_sort;
          }
          return a.c_sort - b.c_sort;
        });

      // 创建工作簿和工作表
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('日报表');

      // 定义列结构
      worksheet.columns = [
        { header: '序号', key: 'index', width: 8 },
        { header: '名称', key: 'name', width: 20 },
        { header: '车辆配置', key: 'car_count', width: 10 },
        { header: '当日销售', key: 'daily_revenue', width: 12 },
        { header: '当日车均', key: 'daily_avg_revenue_cart', width: 10 },
        { header: '当日车次', key: 'daily_cart_count', width: 10 },
        { header: '月目标', key: 'target_income', width: 12 },
        { header: '月累计', key: 'actual_income', width: 12 },
        { header: '累计达成率', key: 'ach_rate', width: 12 },
        { header: '累计车均', key: 'per_car_income', width: 10 },
        { header: '累计车次', key: 'sold_car_count', width: 10 },
      ];

      // 添加数据行
      rawData.forEach((item: any, index: number) => {
        worksheet.addRow({
          index: index + 1,
          name: item.name,
          car_count: item.car_count,
          daily_revenue: item.daily_revenue,
          daily_avg_revenue_cart: item.daily_avg_revenue_cart,
          daily_cart_count: item.daily_cart_count,
          target_income: item.target_income,
          actual_income: item.actual_income,
          ach_rate: item.ach_rate / 100, // 转换为小数供百分比格式使用
          per_car_income: item.per_car_income,
          sold_car_count: item.sold_car_count
        });
      });

      // 设置表头样式
      const headerRow = worksheet.getRow(1);
      headerRow.height = 36; // 设置行高为36磅
      headerRow.eachCell((cell) => {
        cell.font = {
          name: 'Microsoft YaHei',
          size: 11,
          bold: true,
          color: { argb: 'FF000000' }
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center'
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // 设置数据行样式
      for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        row.height = 22; // 设置行高为22磅
        
        row.eachCell((cell, colNumber) => {
          // 通用样式
          cell.font = {
            name: 'Microsoft YaHei',
            size: 10,
            color: { argb: 'FF000000' }
          };
          cell.alignment = {
            vertical: 'middle',
            horizontal: colNumber === 2 ? 'left' : 'center' // 名称列左对齐，其他列居中
          };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };

          // 设置数值格式
          if ([4, 5, 6, 8, 10, 11].includes(colNumber)) {
            // 数值列：当日销售、当日车均、当日车次、月累计、累计车均、累计车次
            cell.numFmt = '0'; // 无小数位，无千位分隔符
          } else if (colNumber === 9) {
            // 百分比列：累计达成率
            cell.numFmt = '0.0%'; // 百分比格式，1位小数
          }
        });
      }

      // 冻结首行
      worksheet.views = [
        { state: 'frozen', ySplit: 1 }
      ];

      // 生成文件并下载
      const fileName = `销售日报表_${selectedDate}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      
      // 创建下载链接
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);

      message.success('导出成功');
    } catch (error) {
      message.error('导出失败：' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setExporting(false);
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
        <title>营业统计 | 销售助手</title>
        <meta name="description" content="查看销售图表数据" />
      </Head>

      <div className={`py-4 md:py-6 ${isMobile ? 'px-3' : 'px-6'}`}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-semibold text-gray-900`}>营业统计</h1>
            <p className="mt-1 text-sm text-gray-500">
              查看营业数据图表。
            </p>
          </div>
          <div className="flex items-center">
            <DatePicker
              value={dayjs(selectedDate)}
              onChange={handleDateChange}
              format="YYYY-MM-DD"
              placeholder="选择日期"
              allowClear={false}
              size={isMobile ? "small" : "middle"}
              style={{ width: isMobile ? 120 : 140 }}
              locale={zhCN}
            />
            <Tooltip title="同步数据（短按直接同步，长按设置选项）">
              <Button 
                icon={<SyncOutlined />} 
                type="text" 
                loading={syncing}
                onMouseDown={handleSyncMouseDown}
                onMouseUp={handleSyncMouseUp}
                onMouseLeave={handleSyncMouseLeave}
                onTouchStart={handleSyncMouseDown}
                onTouchEnd={handleSyncMouseUp}
              />
            </Tooltip>
            <Tooltip title="导出">
              <Button 
                icon={<CloudUploadOutlined />} 
                type="text" 
                onClick={handleExport}
                loading={exporting}
              />
            </Tooltip>   
          </div>
        </div>
      </div>

      <Tabs 
        activeKey={activeTab} 
        onChange={handleTabChange}
        items={tabItems} 
        type="card" 
        size={isMobile ? "small" : "large"}
        className={isMobile ? "mx-3" : ""}
      />

      {/* 数据同步设置弹窗 */}
      <Modal
        title="数据同步设置"
        open={syncModalVisible}
        onOk={handleSyncConfirm}
        onCancel={handleSyncCancel}
        okText="创建任务"
        cancelText="取消"
        width={400}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="text-red-500">*</span> 选择日期
            </label>
            <DatePicker
              value={dayjs(syncDate)}
              onChange={handleSyncDateChange}
              format="YYYY-MM-DD"
              placeholder="选择同步日期"
              allowClear={false}
              style={{ width: '100%' }}
              locale={zhCN}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="text-red-500">*</span> 选择平台
            </label>
            <Select
              value={syncPlatform}
              onChange={setSyncPlatform}
              style={{ width: '100%' }}
              placeholder="选择平台"
            >
              <Select.Option value="all">所有平台</Select.Option>
              <Select.Option value="duowei">多维</Select.Option>
              <Select.Option value="meituan">美团</Select.Option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              同步方式
            </label>
            <Radio.Group
              value={syncType}
              onChange={(e) => setSyncType(e.target.value)}
            >
              <Radio value={true}>同步</Radio>
              <Radio value={false}>异步</Radio>
            </Radio.Group>
          </div>
        </div>
      </Modal>
    </Layout>
  );
};

export default SalesChartsPage; 