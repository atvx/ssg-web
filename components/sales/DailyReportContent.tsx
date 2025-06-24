import React, { useState, useEffect, useRef } from 'react';
import { DatePicker, Card, Button, Modal } from 'antd';
import DailySalesTable from './DailySalesTable';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
// 修改中文语言包的导入方式，解决服务器端渲染问题
import zhCN from 'antd/lib/date-picker/locale/zh_CN';
import domtoimage from 'dom-to-image';
import { DownloadOutlined, EyeOutlined } from '@ant-design/icons';

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
}

const DailyReportContent: React.FC<DailyReportContentProps> = ({ className = '' }) => {
  const [currentDate, setCurrentDate] = useState<dayjs.Dayjs>(dayjs());
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloadLoading, setDownloadLoading] = useState<boolean>(false);
  const [previewVisible, setPreviewVisible] = useState<boolean>(false);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string>('');
  const tableRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    // 模拟API加载数据
    setLoading(true);
    setTimeout(() => {
      const processedData = processData(mockApiData);
      setTableData(processedData);
      setLoading(false);
    }, 500);
  }, [currentDate]);

  const handleDateChange = (date: dayjs.Dayjs | null) => {
    if (date) {
      setCurrentDate(date);
    }
  };

  // 生成表格图片
  const generateTableImage = async () => {
    if (!tableRef.current) return null;
    
    try {
      // 添加临时样式使表格内容垂直居中
      const tempStyles = document.createElement('style');
      tempStyles.innerHTML = `
        .ant-table-tbody > tr > td {
          vertical-align: middle !important;
          height: 35px !important;
          line-height: 35px !important;
          text-align: center !important;
        }
        .ant-table-tbody > tr:not(.subtotal-row):not(.market-boundary-row) > td:nth-child(2) {
          // text-align: left !important;
        }
        .ant-table-tbody > tr.market-boundary-row > td:nth-child(3) {
          // text-align: left !important;
        }
        /* 确保总计行的所有单元格居中对齐 */
        .ant-table-tbody > tr.total-row > td {
          text-align: center !important;
        }
        /* 确保最后一行（总计）的所有单元格居中 */
        .ant-table-tbody > tr:last-child > td {
          text-align: center !important;
        }
        /* 特别确保最后一行的特定单元格居中 */
        .ant-table-tbody > tr:last-child > td:first-child,
        .ant-table-tbody > tr:last-child > td:nth-child(2),
        .ant-table-tbody > tr:last-child > td:nth-child(3),
        .ant-table-tbody > tr:last-child > td:nth-child(4) {
          text-align: center !important;
        }
        /* 特别强调针对显示"127"的单元格，使用更高优先级选择器 */
        .ant-table-tbody > tr:last-child > td:nth-child(4),
        .ant-table-tbody > tr[class*="total"] td:nth-child(4),
        .ant-table-tbody > tr:last-of-type td:nth-child(4),
        .ant-table-tbody > tr:last-child > td[class*="vehicleConfig"],
        table tr:last-child td:nth-child(4) {
          text-align: center !important;
          display: table-cell !important;
          vertical-align: middle !important;
        }
        
        .ant-table-thead > tr > th {
          vertical-align: middle !important;
          height: 40px !important;
          line-height: 40px !important;
          text-align: center !important;
          background-color: #f5f5f5 !important;
          font-weight: bold !important;
        }
        .ant-table-container {
          border: 1px solid #e8e8e8 !important;
          margin: 0 !important;
        }
        .ant-table {
          font-size: 14px !important;
        }
      `;
      document.head.appendChild(tempStyles);
      
      // 添加额外的padding用于预览和导出
      const originalPadding = tableRef.current.style.padding;
      tableRef.current.style.padding = '20px';
      tableRef.current.style.backgroundColor = '#ffffff';
      
      // 使用dom-to-image生成PNG，提高质量
      const dataUrl = await domtoimage.toPng(tableRef.current, {
        quality: 1.0,
        bgcolor: '#ffffff',
        height: tableRef.current.offsetHeight + 40, // 增加一些空间
        width: tableRef.current.offsetWidth, 
        style: {
          margin: '0',
          padding: '20px'
        },
      });
      
      // 恢复原始样式
      tableRef.current.style.padding = originalPadding;
      document.head.removeChild(tempStyles);
      
      return dataUrl;
    } catch (error) {
      console.error('生成图片失败:', error);
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
      }
      
    } catch (error) {
      console.error('下载图片失败:', error);
    } finally {
      setDownloadLoading(false);
    }
  };

  return (
    <div className={className}>
      <Card 
        title={null}
        extra={
          <div className="flex items-center space-x-3">
            <DatePicker
              locale={zhCN}
              value={currentDate}
              onChange={handleDateChange}
              allowClear={false}
            />
            <Button 
              onClick={handlePreview}
              icon={<EyeOutlined />}
              loading={previewLoading}
            >
              预览
            </Button>
            <Button 
              type="primary" 
              icon={<DownloadOutlined />} 
              onClick={handleDownloadImage}
              loading={downloadLoading}
            >
              下载图片
            </Button>
          </div>
        }
      >
        <div 
          ref={tableRef} 
          className="daily-sales-report-container"
          style={{ 
            backgroundColor: '#ffffff',
            borderRadius: '2px',
            overflow: 'hidden'
          }}
        >
          <DailySalesTable data={tableData} loading={loading} date={currentDate} />
        </div>
      </Card>

      <Modal
        title={`市场销售日报 ${currentDate.format('YYYY年MM月DD日')} - 预览`}
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
    </div>
  );
};

export default DailyReportContent; 