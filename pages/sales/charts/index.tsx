import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import SalesCharts from '@/components/sales/SalesCharts';
import DailyReportContent from '@/components/sales/DailyReportContent';
import MonthlySalesCharts from '@/components/sales/MonthlySalesCharts';
import { Spin, Tabs, DatePicker } from 'antd';
import type { TabsProps } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import zhCN from 'antd/lib/date-picker/locale/zh_CN';

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
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const isMobile = useIsMobile();

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
      children: <DailyReportContent className="mt-4" selectedDate={selectedDate} />,
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
    </Layout>
  );
};

export default SalesChartsPage; 