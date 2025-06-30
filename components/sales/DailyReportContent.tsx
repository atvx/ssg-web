import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Modal, Spin, ConfigProvider, FloatButton, Tooltip, message } from 'antd';
import DailySalesTable from './DailySalesTable';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
// 修改中文语言包的导入方式，解决服务器端渲染问题
import zhCN from 'antd/locale/zh_CN';
import domtoimage from 'dom-to-image';
import { DownloadOutlined, EyeOutlined, FileImageOutlined, ReloadOutlined } from '@ant-design/icons';

// 使用新的数据格式
interface WarehouseData {
  id: string;
  name: string;
  status: number;
  car_count: number;
  daily_revenue: number;
  daily_avg_revenue_cart: number;
  daily_cart_count: number;
  target_income: number;
  actual_income: number;
  ach_rate: number;
  per_car_income: number;
  sold_car_count: number;
  parent_id: string;
  parent_name: string;
  p_sort: number;
  c_sort: number;
}

// 模拟API数据
const mockApiData: WarehouseData[] = [
  {
    "id": "002",
    "name": "重庆江北仓",
    "status": 1,
    "car_count": 14,
    "daily_revenue": 1522.0,
    "daily_avg_revenue_cart": 380.0,
    "daily_cart_count": 4,
    "target_income": 250000.0,
    "actual_income": 71205.0,
    "ach_rate": 28.5,
    "per_car_income": 346.0,
    "sold_car_count": 206,
    "parent_id": "4001208",
    "parent_name": "重庆市场",
    "p_sort": 1,
    "c_sort": 1
  },
  {
    "id": "044",
    "name": "重庆渝北仓",
    "status": 1,
    "car_count": 14,
    "daily_revenue": 8459.0,
    "daily_avg_revenue_cart": 846.0,
    "daily_cart_count": 10,
    "target_income": 335000.0,
    "actual_income": 144557.0,
    "ach_rate": 43.2,
    "per_car_income": 629.0,
    "sold_car_count": 230,
    "parent_id": "4001208",
    "parent_name": "重庆市场",
    "p_sort": 1,
    "c_sort": 2
  },
  {
    "id": "104",
    "name": "重庆二郎仓",
    "status": 1,
    "car_count": 14,
    "daily_revenue": 2671.0,
    "daily_avg_revenue_cart": 382.0,
    "daily_cart_count": 7,
    "target_income": 237000.0,
    "actual_income": 94404.0,
    "ach_rate": 39.8,
    "per_car_income": 510.0,
    "sold_car_count": 185,
    "parent_id": "4001208",
    "parent_name": "重庆市场",
    "p_sort": 1,
    "c_sort": 3
  },
  {
    "id": "3868380",
    "name": "重庆大学城仓",
    "status": 1,
    "car_count": 10,
    "daily_revenue": 1729.0,
    "daily_avg_revenue_cart": 288.0,
    "daily_cart_count": 6,
    "target_income": 112000.0,
    "actual_income": 28659.0,
    "ach_rate": 25.6,
    "per_car_income": 308.0,
    "sold_car_count": 93,
    "parent_id": "4001208",
    "parent_name": "重庆市场",
    "p_sort": 1,
    "c_sort": 4
  },
  {
    "id": "3880678",
    "name": "重庆北碚仓",
    "status": 1,
    "car_count": 10,
    "daily_revenue": 2436.0,
    "daily_avg_revenue_cart": 609.0,
    "daily_cart_count": 4,
    "target_income": 75000.0,
    "actual_income": 45733.0,
    "ach_rate": 61.0,
    "per_car_income": 381.0,
    "sold_car_count": 120,
    "parent_id": "4001208",
    "parent_name": "重庆市场",
    "p_sort": 1,
    "c_sort": 5
  },
  {
    "id": "3921161",
    "name": "重庆南岸仓",
    "status": 1,
    "car_count": 10,
    "daily_revenue": 863.0,
    "daily_avg_revenue_cart": 432.0,
    "daily_cart_count": 2,
    "target_income": 152000.0,
    "actual_income": 49421.0,
    "ach_rate": 32.5,
    "per_car_income": 408.0,
    "sold_car_count": 121,
    "parent_id": "4001208",
    "parent_name": "重庆市场",
    "p_sort": 1,
    "c_sort": 6
  },
  {
    "id": "3975935",
    "name": "重庆中央公园仓",
    "status": 1,
    "car_count": 10,
    "daily_revenue": 4987.0,
    "daily_avg_revenue_cart": 831.0,
    "daily_cart_count": 6,
    "target_income": 74000.0,
    "actual_income": 55610.0,
    "ach_rate": 75.1,
    "per_car_income": 545.0,
    "sold_car_count": 102,
    "parent_id": "4001208",
    "parent_name": "重庆市场",
    "p_sort": 1,
    "c_sort": 7
  },
  {
    "id": "4015037",
    "name": "重庆北部新区仓",
    "status": 1,
    "car_count": 6,
    "daily_revenue": 1435.0,
    "daily_avg_revenue_cart": 717.0,
    "daily_cart_count": 2,
    "target_income": 46000.0,
    "actual_income": 14503.0,
    "ach_rate": 31.5,
    "per_car_income": 315.0,
    "sold_car_count": 46,
    "parent_id": "4001208",
    "parent_name": "重庆市场",
    "p_sort": 1,
    "c_sort": 8
  },
  {
    "id": "125",
    "name": "昆明龙泉仓",
    "status": 0,
    "car_count": 9,
    "daily_revenue": 0.0,
    "daily_avg_revenue_cart": 0.0,
    "daily_cart_count": 0,
    "target_income": 120000.0,
    "actual_income": 21004.0,
    "ach_rate": 17.5,
    "per_car_income": 273.0,
    "sold_car_count": 77,
    "parent_id": "4053782",
    "parent_name": "昆明市场",
    "p_sort": 2,
    "c_sort": 1
  },
  {
    "id": "4019004",
    "name": "昆明广卫仓",
    "status": 1,
    "car_count": 15,
    "daily_revenue": 1898.0,
    "daily_avg_revenue_cart": 271.0,
    "daily_cart_count": 7,
    "target_income": 110000.0,
    "actual_income": 40671.0,
    "ach_rate": 37.0,
    "per_car_income": 242.0,
    "sold_car_count": 168,
    "parent_id": "4053782",
    "parent_name": "昆明市场",
    "p_sort": 2,
    "c_sort": 2
  },
  {
    "id": "4010644",
    "name": "昆明世博仓",
    "status": 1,
    "car_count": 10,
    "daily_revenue": 1623.0,
    "daily_avg_revenue_cart": 232.0,
    "daily_cart_count": 7,
    "target_income": 63000.0,
    "actual_income": 45550.0,
    "ach_rate": 72.3,
    "per_car_income": 304.0,
    "sold_car_count": 150,
    "parent_id": "4053782",
    "parent_name": "昆明市场",
    "p_sort": 2,
    "c_sort": 3
  },
  {
    "id": "4117102",
    "name": "成都高新区仓",
    "status": 1,
    "car_count": 5,
    "daily_revenue": 2167.0,
    "daily_avg_revenue_cart": 433.0,
    "daily_cart_count": 5,
    "target_income": 52000.0,
    "actual_income": 32262.0,
    "ach_rate": 62.0,
    "per_car_income": 358.0,
    "sold_car_count": 90,
    "parent_id": "4084216",
    "parent_name": "成都市场",
    "p_sort": 3,
    "c_sort": 1
  }
];

interface DailyReportContentProps {
  className?: string;
  selectedDate?: string;
}

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

const DailyReportContent: React.FC<DailyReportContentProps> = ({ className = '', selectedDate }) => {
  const [currentDate, setCurrentDate] = useState<dayjs.Dayjs>(dayjs(selectedDate || dayjs().format('YYYY-MM-DD')));
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloadLoading, setDownloadLoading] = useState<boolean>(false);
  const [previewVisible, setPreviewVisible] = useState<boolean>(false);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // 处理API数据，添加小计和总计
  const processData = (data: WarehouseData[]) => {
    // 按市场分组
    const marketGroups: { [key: string]: WarehouseData[] } = {};
    
    data.forEach(item => {
      if (!marketGroups[item.parent_id]) {
        marketGroups[item.parent_id] = [];
      }
      marketGroups[item.parent_id].push(item);
    });
    
    // 对每个市场数据按c_sort排序
    Object.keys(marketGroups).forEach(marketId => {
      marketGroups[marketId].sort((a, b) => a.c_sort - b.c_sort);
    });
    
    // 获取所有市场ID，并按p_sort排序
    const marketIds = Object.keys(marketGroups);
    marketIds.sort((a, b) => {
      const marketA = marketGroups[a][0];
      const marketB = marketGroups[b][0];
      return marketA.p_sort - marketB.p_sort;
    });
    
    // 准备最终表格数据
    const formattedData: any[] = [];
    let totalCarCount = 0;
    let totalDailyRevenue = 0;
    let totalDailyCartCount = 0;
    let totalTargetIncome = 0;
    let totalActualIncome = 0;
    let totalSoldCarCount = 0;
    
    // 处理每个市场
    marketIds.forEach(marketId => {
      const marketData = marketGroups[marketId];
      const marketName = '📍' + marketData[0].parent_name;
      
      // 市场汇总数据
      let marketCarCount = 0;
      let marketDailyRevenue = 0;
      let marketDailyCartCount = 0;
      let marketTargetIncome = 0;
      let marketActualIncome = 0;
      let marketSoldCarCount = 0;
      
      // 处理每个仓库
      marketData.forEach((item, index) => {
        marketCarCount += item.car_count;
        marketDailyRevenue += item.daily_revenue;
        marketDailyCartCount += item.daily_cart_count;
        marketTargetIncome += item.target_income;
        marketActualIncome += item.actual_income;
        marketSoldCarCount += item.sold_car_count;
        
        formattedData.push({
          key: item.id,
          area: marketName,
          rank: index + 1,
          name: item.name,
          vehicleConfig: item.car_count,
          dailySales: item.daily_revenue,
          dailyAverage: item.daily_avg_revenue_cart,
          dailyTrips: item.daily_cart_count,
          monthTarget: item.target_income,
          monthTotal: item.actual_income,
          completionRate: item.ach_rate.toFixed(1),
          totalAverage: item.per_car_income,
          totalTrips: item.sold_car_count,
          isSubtotal: false,
          isTotal: false
        });
      });
      
      // 添加市场小计行
      const marketDailyAverage = marketDailyCartCount > 0 ? marketDailyRevenue / marketDailyCartCount : 0;
      const marketTotalAverage = marketSoldCarCount > 0 ? marketActualIncome / marketSoldCarCount : 0;
      const marketCompletionRate = marketTargetIncome > 0 ? (marketActualIncome / marketTargetIncome * 100) : 0;
      
      formattedData.push({
        key: `subtotal-${marketId}`,
        area: marketName,
        rank: 0,
        name: '小计',
        vehicleConfig: marketCarCount,
        dailySales: marketDailyRevenue,
        dailyAverage: Math.round(marketDailyAverage),
        dailyTrips: marketDailyCartCount,
        monthTarget: marketTargetIncome,
        monthTotal: marketActualIncome,
        completionRate: marketCompletionRate.toFixed(1),
        totalAverage: Math.round(marketTotalAverage),
        totalTrips: marketSoldCarCount,
        isSubtotal: true,
        isTotal: false
      });
      
      // 累加总计数据
      totalCarCount += marketCarCount;
      totalDailyRevenue += marketDailyRevenue;
      totalDailyCartCount += marketDailyCartCount;
      totalTargetIncome += marketTargetIncome;
      totalActualIncome += marketActualIncome;
      totalSoldCarCount += marketSoldCarCount;
    });
    
    // 添加总计行
    const totalDailyAverage = totalDailyCartCount > 0 ? totalDailyRevenue / totalDailyCartCount : 0;
    const totalAverage = totalSoldCarCount > 0 ? totalActualIncome / totalSoldCarCount : 0;
    const totalCompletionRate = totalTargetIncome > 0 ? (totalActualIncome / totalTargetIncome * 100) : 0;
    
    formattedData.push({
      key: 'total',
      area: '总计',
      rank: null,
      name: null,
      vehicleConfig: totalCarCount,
      dailySales: totalDailyRevenue,
      dailyAverage: Math.round(totalDailyAverage),
      dailyTrips: totalDailyCartCount,
      monthTarget: totalTargetIncome,
      monthTotal: totalActualIncome,
      completionRate: totalCompletionRate.toFixed(1),
      totalAverage: Math.round(totalAverage),
      totalTrips: totalSoldCarCount,
      isSubtotal: false,
      isTotal: true
    });
    
    return formattedData;
  };

  // 同步外部传入的selectedDate
  useEffect(() => {
    if (selectedDate) {
      setCurrentDate(dayjs(selectedDate));
    }
  }, [selectedDate]);

  useEffect(() => {
    // 模拟API加载数据
    setLoading(true);
    setTimeout(() => {
      const processedData = processData(mockApiData);
      setTableData(processedData);
      setLoading(false);
    }, 500);
  }, [currentDate]);



  // 刷新数据
  const handleRefresh = () => {
    setIsRefreshing(true);
    setLoading(true);
    setTimeout(() => {
      const processedData = processData(mockApiData);
      setTableData(processedData);
      setLoading(false);
      setIsRefreshing(false);
      message.success('数据刷新成功');
    }, 1000);
  };

  // 生成表格图片
  const generateTableImage = async () => {
    if (!tableRef.current) return null;
    
    try {
      // 临时显示表格元素
      const originalDisplay = tableRef.current.style.display;
      tableRef.current.style.display = 'block';
      
      // 添加临时样式使表格内容垂直居中
      const tempStyles = document.createElement('style');
      tempStyles.innerHTML = `
        .daily-sales-report-container {
          width: ${isMobile ? 'auto' : 'auto'} !important;
          min-width: ${isMobile ? '1400px' : 'auto'} !important;
          overflow: visible !important;
        }
        .daily-sales-report-container .ant-table-wrapper {
          min-width: ${isMobile ? '1400px' : 'auto'} !important;
        }
        .daily-sales-report-container .ant-table {
          min-width: ${isMobile ? '1400px' : 'auto'} !important;
          font-size: ${isMobile ? '11px' : '13px'} !important;
          table-layout: fixed !important;
        }
        
        /* 设置列宽 */
        .ant-table-thead > tr > th:nth-child(1) { width: 80px !important; } /* 区域 */
        .ant-table-thead > tr > th:nth-child(2) { width: 50px !important; } /* 序号 */
        .ant-table-thead > tr > th:nth-child(3) { width: 140px !important; } /* 名称 */
        .ant-table-thead > tr > th:nth-child(4) { width: 80px !important; } /* 车辆配置 */
        .ant-table-thead > tr > th:nth-child(5) { width: 90px !important; } /* 当日销售 */
        .ant-table-thead > tr > th:nth-child(6) { width: 80px !important; } /* 当日车均 */
        .ant-table-thead > tr > th:nth-child(7) { width: 80px !important; } /* 当日车次 */
        .ant-table-thead > tr > th:nth-child(8) { width: 110px !important; } /* 月目标 */
        .ant-table-thead > tr > th:nth-child(9) { width: 110px !important; } /* 月累计 */
        .ant-table-thead > tr > th:nth-child(10) { width: 80px !important; } /* 累计达成率 */
        .ant-table-thead > tr > th:nth-child(11) { width: 80px !important; } /* 累计车均 */
        .ant-table-thead > tr > th:nth-child(12) { width: 80px !important; } /* 累计车次 */

        .ant-table-tbody > tr > td:nth-child(1) { width: 80px !important; }
        .ant-table-tbody > tr > td:nth-child(2) { width: 50px !important; }
        .ant-table-tbody > tr > td:nth-child(3) { width: 140px !important; }
        .ant-table-tbody > tr > td:nth-child(4) { width: 80px !important; }
        .ant-table-tbody > tr > td:nth-child(5) { width: 90px !important; }
        .ant-table-tbody > tr > td:nth-child(6) { width: 80px !important; }
        .ant-table-tbody > tr > td:nth-child(7) { width: 80px !important; }
        .ant-table-tbody > tr > td:nth-child(8) { width: 110px !important; }
        .ant-table-tbody > tr > td:nth-child(9) { width: 110px !important; }
        .ant-table-tbody > tr > td:nth-child(10) { width: 80px !important; }
        .ant-table-tbody > tr > td:nth-child(11) { width: 80px !important; }
        .ant-table-tbody > tr > td:nth-child(12) { width: 80px !important; }
        
        .ant-table-tbody > tr > td {
          vertical-align: middle !important;
          height: 32px !important;
          line-height: 32px !important;
          text-align: center !important;
          padding: ${isMobile ? '2px 4px' : '4px 8px'} !important;
          white-space: nowrap !important;
          border: 1px solid #e8e8e8 !important;
          font-size: ${isMobile ? '10px' : '12px'} !important;
        }
        
        /* 名称列左对齐 */
        .ant-table-tbody > tr > td:nth-child(3) {
          text-align: left !important;
          padding-left: 8px !important;
        }
        
        /* 数字列右对齐 */
        .ant-table-tbody > tr > td:nth-child(4),
        .ant-table-tbody > tr > td:nth-child(5),
        .ant-table-tbody > tr > td:nth-child(6),
        .ant-table-tbody > tr > td:nth-child(7),
        .ant-table-tbody > tr > td:nth-child(8),
        .ant-table-tbody > tr > td:nth-child(9),
        .ant-table-tbody > tr > td:nth-child(11),
        .ant-table-tbody > tr > td:nth-child(12) {
          text-align: right !important;
          padding-right: 8px !important;
        }
        
        /* 百分比列居中对齐 */
        .ant-table-tbody > tr > td:nth-child(10) {
          text-align: center !important;
        }
        
        .ant-table-thead > tr > th {
          vertical-align: middle !important;
          height: 35px !important;
          line-height: 35px !important;
          text-align: center !important;
          background-color: #f0f0f0 !important;
          font-weight: bold !important;
          padding: ${isMobile ? '2px 4px' : '4px 8px'} !important;
          white-space: nowrap !important;
          font-size: ${isMobile ? '10px' : '12px'} !important;
          border: 1px solid #d9d9d9 !important;
        }
        
        .ant-table-container {
          border: 1px solid #d9d9d9 !important;
          margin: 0 !important;
          overflow: visible !important;
        }
        
        .ant-table {
          font-size: ${isMobile ? '10px' : '12px'} !important;
          border-collapse: collapse !important;
        }
        
        /* 小计和总计行样式 */
        .ant-table-tbody > tr.subtotal-row > td,
        .ant-table-tbody > tr.total-row > td,
        .ant-table-tbody > tr:last-child > td {
          background-color: #f9f9f9 !important;
          font-weight: bold !important;
        }
        
        /* 额外优化样式 */
        .daily-sales-report-container * {
          box-sizing: border-box !important;
        }
        
        /* 优化移动端显示 */
        ${isMobile ? `
          .ant-table-thead > tr > th,
          .ant-table-tbody > tr > td {
            font-size: 11px !important;
            padding: 3px 5px !important;
            height: 30px !important;
            line-height: 24px !important;
          }
          .daily-sales-report-container .ant-table {
            min-width: 1300px !important;
          }
        ` : ''}
      `;
      document.head.appendChild(tempStyles);
      
      // 添加额外的padding用于预览和导出
      const originalPadding = tableRef.current.style.padding;
      const originalWidth = tableRef.current.style.width;
      const originalMinWidth = tableRef.current.style.minWidth;
      
      tableRef.current.style.padding = '20px';
      tableRef.current.style.backgroundColor = '#ffffff';
      
      // 移动端设置更大的宽度确保表格完整显示
      if (isMobile) {
        tableRef.current.style.width = 'auto';
        tableRef.current.style.minWidth = '1400px';
      }
      
      // 等待样式应用
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 使用dom-to-image生成PNG，提高质量
      const dataUrl = await domtoimage.toPng(tableRef.current, {
        quality: 1.0,
        bgcolor: '#ffffff',
        height: tableRef.current.offsetHeight + 40,
        width: isMobile ? Math.max(1400, tableRef.current.offsetWidth) : tableRef.current.offsetWidth,
        style: {
          margin: '0',
          padding: '20px'
        },
        cacheBust: true // 避免缓存问题
      });
      
      // 恢复原始样式
      tableRef.current.style.padding = originalPadding;
      tableRef.current.style.display = originalDisplay;
      tableRef.current.style.width = originalWidth;
      tableRef.current.style.minWidth = originalMinWidth;
      document.head.removeChild(tempStyles);
      
      return dataUrl;
    } catch (error) {
      console.error('生成图片失败:', error);
      message.error('生成图片失败，请稍后再试');
      return null;
    }
  };

  // 预览表格图片
  const handlePreview = async () => {
    setPreviewLoading(true);
    try {
      const imageUrl = await generateTableImage();
      if (imageUrl) {
        setPreviewImageUrl(imageUrl);
        setPreviewVisible(true);
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  // 下载表格为图片
  const handleDownloadImage = async () => {
    if (!tableRef.current) return;
    
    try {
      setDownloadLoading(true);
      
      // 获取表格的标题
      const title = `市场销售日报 ${currentDate.format('YYYY年MM月DD日')}`;
      
      const imageUrl = await generateTableImage();
      if (imageUrl) {
        // 创建下载链接
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `${title}.png`;
        link.click();
        message.success('图片下载成功');
      }
      
    } catch (error) {
      console.error('下载图片失败:', error);
      message.error('下载图片失败，请稍后再试');
    } finally {
      setDownloadLoading(false);
    }
  };

  return (
    <ConfigProvider locale={zhCN}>
      <div className={`${className} ${isMobile ? 'px-3' : 'px-6'} py-4 md:py-6`}>
        {/* 页面头部 */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4 md:gap-0">
          <div>
            <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-semibold text-gray-900`}>
              市场销售日报
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              查看和导出每日销售数据报表。
            </p>
          </div>
          {!isMobile && (
            <div className="flex flex-wrap gap-2 self-end md:self-auto">
              <Tooltip title="预览报表">
                <Button 
                  icon={<EyeOutlined />} 
                  onClick={handlePreview}
                  loading={previewLoading}
                  className="rounded-lg"
                  size="middle"
                >
                  预览
                </Button>
              </Tooltip>
              <Tooltip title="下载图片">
                <Button 
                  type="primary" 
                  icon={<DownloadOutlined />} 
                  onClick={handleDownloadImage}
                  loading={downloadLoading}
                  className="rounded-lg"
                  size="middle"
                >
                  下载图片
                </Button>
              </Tooltip>
              <Tooltip title="刷新数据">
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={handleRefresh}
                  loading={isRefreshing}
                  className="rounded-lg"
                  size="middle"
                >
                  刷新
                </Button>
              </Tooltip>
            </div>
          )}
        </div>



        {/* 表格容器 */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <Spin size="large">
                <div className="mt-4 text-gray-500">加载中...</div>
              </Spin>
            </div>
          ) : (
            <div className={`${isMobile ? 'p-3' : 'p-6'}`}>
              <div className="text-center mb-4">
                <h2 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-gray-800`}>
                  市场销售日报 - {currentDate.format('YYYY年MM月DD日')}
                </h2>
                {isMobile && (
                  <div className="text-xs text-gray-500 mt-2">
                    👆 左右滑动查看完整表格
                  </div>
                )}
              </div>
              {/* 表格滚动容器 */}
              <div 
                className={`${isMobile ? 'overflow-x-auto' : ''}`}
                style={isMobile ? { 
                  minWidth: '100%',
                  scrollbarWidth: 'thin',
                  WebkitOverflowScrolling: 'touch'
                } : {}}
              >
                <div style={isMobile ? { minWidth: '900px' } : {}}>
                  <DailySalesTable data={tableData} loading={loading} date={currentDate} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 隐藏的表格容器用于生成图片 */}
        <div 
          ref={tableRef} 
          className="daily-sales-report-container"
          style={{ 
            display: 'none',
            backgroundColor: '#ffffff',
            borderRadius: '2px',
            overflow: 'hidden'
          }}
        >
          <div style={{ 
            textAlign: 'center', 
            padding: '16px 20px 12px 20px',
            borderBottom: '2px solid #333',
            marginBottom: '16px'
          }}>
            <h2 style={{ 
              margin: 0, 
              fontSize: isMobile ? '16px' : '20px', 
              fontWeight: 'bold',
              color: '#333'
            }}>
              市场销售日报 {currentDate.format('YYYY年MM月DD日')}
            </h2>
          </div>
          <DailySalesTable data={tableData} loading={loading} date={currentDate} />
        </div>

        {/* 预览模态框 */}
        <Modal
          title={
            <div className="flex items-center">
              <FileImageOutlined className="mr-2" />
              {`市场销售日报 ${currentDate.format('YYYY年MM月DD日')} - 预览`}
            </div>
          }
          open={previewVisible}
          onCancel={() => setPreviewVisible(false)}
          width={1100}
          styles={{ body: { maxHeight: '80vh', overflow: 'auto' } }}
          footer={[
            <Button key="close" onClick={() => setPreviewVisible(false)}>
              关闭
            </Button>,
            <Button
              key="download"
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => {
                // 创建下载链接
                const title = `市场销售日报 ${currentDate.format('YYYY年MM月DD日')}`;
                const link = document.createElement('a');
                link.href = previewImageUrl;
                link.download = `${title}.png`;
                link.click();
                message.success('图片下载成功');
              }}
            >
              下载图片
            </Button>
          ]}
        >
          <div style={{ overflow: 'auto', textAlign: 'center', padding: '10px', backgroundColor: '#f0f2f5' }}>
            {previewImageUrl && (
              <img 
                src={previewImageUrl} 
                alt="预览图片" 
                style={{ 
                  maxWidth: '100%',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                  border: '1px solid #d9d9d9'
                }}
              />
            )}
          </div>
        </Modal>

        {/* 移动端浮动按钮 */}
        {isMobile && (
          <FloatButton.Group
            trigger="click"
            type="primary"
            style={{ right: 24 }}
            icon={<FileImageOutlined />}
          >
            <FloatButton
              icon={<EyeOutlined />}
              tooltip="预览报表"
              onClick={handlePreview}
            />
            <FloatButton
              icon={<DownloadOutlined />}
              tooltip="下载图片"
              onClick={handleDownloadImage}
            />
            <FloatButton
              icon={<ReloadOutlined />}
              tooltip="刷新数据"
              onClick={handleRefresh}
            />
          </FloatButton.Group>
        )}
      </div>
    </ConfigProvider>
  );
};

export default DailyReportContent; 