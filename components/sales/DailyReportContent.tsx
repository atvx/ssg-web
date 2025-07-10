import React, { useState, useEffect } from 'react';
import { Card, Button, Spin, ConfigProvider, FloatButton, Tooltip, message } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import zhCN from 'antd/locale/zh_CN';
import { ReloadOutlined } from '@ant-design/icons';
import { useIsMobile } from '@/hooks/useIsMobile';
import apiClient from '@/lib/api';

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

interface DailyReportContentProps {
  className?: string;
  selectedDate?: string;
}

// 添加排序类型定义
type SortField = 'car_count' | 'daily_revenue' | 'daily_avg_revenue_cart' | 'daily_cart_count' | 'target_income' | 'actual_income' | 'ach_rate' | 'per_car_income' | 'sold_car_count';
type SortOrder = 'ascend' | 'descend' | null;

const DailyReportContent: React.FC<DailyReportContentProps> = ({ className = '', selectedDate }) => {
  const [currentDate, setCurrentDate] = useState<dayjs.Dayjs>(dayjs(selectedDate || dayjs().format('YYYY-MM-DD')));
  const [tableData, setTableData] = useState<WarehouseData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const isMobile = useIsMobile();
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);

  // 格式化数字：移除不必要的小数点和零
  const formatNumber = (num: number): string => {
    if (num === 0) return '0';
    
    // 转换为字符串，并移除末尾不必要的零
    let str = num.toString();
    
    // 如果包含小数点
    if (str.includes('.')) {
      // 移除末尾的零
      str = str.replace(/\.?0+$/, '');
    }
    
    return str;
  };

  // 加载数据
  const loadData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/report/daily', {
        params: {
          query_date: currentDate.format('YYYY-MM-DD')
        }
      });
      
      if (response.data.success) {
        // 过滤并排序数据
        const filteredData = response.data.data
          .filter((item: WarehouseData) => 
            item.status !== 0 && item.sold_car_count > 0
          )
          .sort((a: WarehouseData, b: WarehouseData) => {
            if (a.p_sort !== b.p_sort) {
              return a.p_sort - b.p_sort;
            }
            return a.c_sort - b.c_sort;
          });
        setTableData(filteredData);
      } else {
        message.error(response.data.message || '获取数据失败');
      }
    } catch (error) {
      message.error('获取数据失败，请稍后重试');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // 同步外部传入的selectedDate
  useEffect(() => {
    if (selectedDate) {
      setCurrentDate(dayjs(selectedDate));
    }
  }, [selectedDate]);

  // 初始加载和日期变化时加载数据
  useEffect(() => {
    loadData();
  }, [currentDate]);

  // 处理刷新
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  // 处理排序
  const handleSort = (field: SortField) => {
    let newOrder: SortOrder = 'ascend';
    
    // 如果已经是升序，切换为降序
    if (sortField === field && sortOrder === 'ascend') {
      newOrder = 'descend';
    }
    // 如果已经是降序，取消排序
    else if (sortField === field && sortOrder === 'descend') {
      newOrder = null;
    }

    setSortField(field);
    setSortOrder(newOrder);

    // 排序数据
    const sortedData = [...tableData].sort((a, b) => {
      if (!newOrder) return 0;
      
      const aValue = a[field];
      const bValue = b[field];
      
      if (newOrder === 'ascend') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    setTableData(sortedData);
  };

  // 渲染排序图标
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <span className="ml-1 text-gray-400">
          ⇅
        </span>
      );
    }
    
    return (
      <span className="ml-1 text-blue-500">
        {sortOrder === 'ascend' ? '↑' : sortOrder === 'descend' ? '↓' : '⇅'}
      </span>
    );
  };

  // 渲染表格
  const renderTable = () => {
    return (
      <div className={`overflow-x-auto ${isMobile ? 'relative' : ''}`}>
        <table className={`divide-y divide-gray-200 ${isMobile ? 'min-w-max' : 'min-w-full'}`}>
          <thead className="bg-gray-50">
            <tr>
              <th className={`px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap ${isMobile ? 'sticky left-0 bg-gray-50 z-10 w-12' : ''}`}>序号</th>
              <th className={`px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap ${isMobile ? 'sticky left-12 bg-gray-50 z-10 border-gray-300 w-32 min-w-32 shadow-r' : ''}`}>名称</th>
              <th 
                className={`px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100 ${isMobile ? 'min-w-20' : ''}`}
                onClick={() => handleSort('car_count')}
              >
                车辆配置{renderSortIcon('car_count')}
              </th>
              <th 
                className={`px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100 ${isMobile ? 'min-w-20' : ''}`}
                onClick={() => handleSort('daily_revenue')}
              >
                当日销售{renderSortIcon('daily_revenue')}
              </th>
              <th 
                className={`px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100 ${isMobile ? 'min-w-20' : ''}`}
                onClick={() => handleSort('daily_avg_revenue_cart')}
              >
                当日车均{renderSortIcon('daily_avg_revenue_cart')}
              </th>
              <th 
                className={`px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100 ${isMobile ? 'min-w-20' : ''}`}
                onClick={() => handleSort('daily_cart_count')}
              >
                当日车次{renderSortIcon('daily_cart_count')}
              </th>
              <th 
                className={`px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100 ${isMobile ? 'min-w-20' : ''}`}
                onClick={() => handleSort('target_income')}
              >
                月目标{renderSortIcon('target_income')}
              </th>
              <th 
                className={`px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100 ${isMobile ? 'min-w-20' : ''}`}
                onClick={() => handleSort('actual_income')}
              >
                月累计{renderSortIcon('actual_income')}
              </th>
              <th 
                className={`px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100 ${isMobile ? 'min-w-24' : ''}`}
                onClick={() => handleSort('ach_rate')}
              >
                累计达成率{renderSortIcon('ach_rate')}
              </th>
              <th 
                className={`px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100 ${isMobile ? 'min-w-20' : ''}`}
                onClick={() => handleSort('per_car_income')}
              >
                累计车均{renderSortIcon('per_car_income')}
              </th>
              <th 
                className={`px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100 ${isMobile ? 'min-w-20' : ''}`}
                onClick={() => handleSort('sold_car_count')}
              >
                累计车次{renderSortIcon('sold_car_count')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tableData.map((item, index) => {
              const isNewMarket = index === 0 || item.parent_id !== tableData[index - 1].parent_id;
              
              return (
                <tr key={item.id} className={`${isNewMarket ? 'border-t-2 border-gray-300' : ''}`}>
                  <td className={`px-3 py-2 whitespace-nowrap text-sm text-gray-500 ${isMobile ? 'sticky left-0 bg-white z-10 w-12' : ''}`}>{index + 1}</td>
                  <td className={`px-3 py-2 whitespace-nowrap ${isMobile ? 'sticky left-12 bg-white z-10 border-gray-300 w-32 min-w-32 shadow-r' : ''}`}>
                    <div className="text-sm text-gray-900">{item.name}</div>
                  </td>
                  <td className={`px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900 ${isMobile ? 'min-w-20' : ''}`}>{item.car_count}</td>
                  <td className={`px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900 ${isMobile ? 'min-w-20' : ''}`}>{formatNumber(item.daily_revenue)}</td>
                  <td className={`px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900 ${isMobile ? 'min-w-20' : ''}`}>{formatNumber(item.daily_avg_revenue_cart)}</td>
                  <td className={`px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900 ${isMobile ? 'min-w-20' : ''}`}>{item.daily_cart_count}</td>
                  <td className={`px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900 ${isMobile ? 'min-w-20' : ''}`}>{formatNumber(item.target_income)}</td>
                  <td className={`px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900 ${isMobile ? 'min-w-20' : ''}`}>{formatNumber(item.actual_income)}</td>
                  <td className={`px-3 py-2 whitespace-nowrap text-sm text-center ${isMobile ? 'min-w-24' : ''}`}>
                    <span 
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.ach_rate >= 100 ? 'bg-green-100 text-green-800' :
                        item.ach_rate >= 80 ? 'bg-blue-100 text-blue-800' :
                        item.ach_rate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}
                    >
                      {formatNumber(item.ach_rate)}%
                    </span>
                  </td>
                  <td className={`px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900 ${isMobile ? 'min-w-20' : ''}`}>{formatNumber(item.per_car_income)}</td>
                  <td className={`px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900 ${isMobile ? 'min-w-20' : ''}`}>{item.sold_car_count}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <ConfigProvider locale={zhCN}>
      <div className={`${className} py-4`}>
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
              </div>
              {/* 表格滚动容器 */}
              <div 
                className={`overflow-x-auto ${isMobile ? 'pb-2' : ''}`}
                style={{
                  scrollbarWidth: 'thin',
                  WebkitOverflowScrolling: 'touch',
                  ...(isMobile && {
                    scrollbarWidth: 'thin',
                    msOverflowStyle: 'auto'
                  })
                }}
              >
                {renderTable()}
              </div>
            </div>
          )}
        </div>
      </div>
    </ConfigProvider>
  );
};

export default DailyReportContent; 