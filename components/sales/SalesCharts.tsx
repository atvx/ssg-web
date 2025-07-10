import React, { useState, useEffect } from 'react';
import { Card, Radio, Spin, Alert } from 'antd';
import { salesAPI } from '@/lib/api';
import WeeklySalesChart from './WeeklySalesChart';
import DailyAverageChart from './DailyAverageChart';
import WeeklyTripsChart from './WeeklyTripsChart';
import DailyTripsChart from './DailyTripsChart';

interface SalesChartsProps {
  className?: string;
  selectedDate?: string;
  refreshKey?: number;
}

interface WarehouseData {
  name: string;
  car_count: number;
  this_week_sales: number;
  last_week_sales: number;
  sales_wow_pct: number;
  this_week_avg: number;
  last_week_avg: number;
  avg_wow_pct: number;
  this_week_cart: number;
  last_week_cart: number;
  cart_wow_pct: number;
  this_daily_cart: number;
  last_daily_cart: number;
  daily_cart_wow_pct: number;
}

interface ApiResponse {
  query_date: string;
  date_ranges: {
    this_week: { start: string; end: string; label: string };
    last_week: { start: string; end: string; label: string };
  };
  warehouses: WarehouseData[];
}

type CategoryType = 'warehouse' | 'market';

const SalesCharts: React.FC<SalesChartsProps> = ({ className = '', selectedDate, refreshKey }) => {
  const [category, setCategory] = useState<CategoryType>('warehouse');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiData, setApiData] = useState<ApiResponse | null>(null);

  // 获取数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        // 使用传入的日期或当前日期作为查询日期
        const queryDate = selectedDate || new Date().toISOString().split('T')[0];
        const response = await salesAPI.getWeeklyStats({ query_date: queryDate });
        
        if (response.data.success) {
          setApiData(response.data.data);
        } else {
          setError(response.data.message || '获取数据失败');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || '网络请求失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedDate]);

  // 监听refreshKey变化，用于数据同步后刷新
  useEffect(() => {
    if (refreshKey && refreshKey > 0) {
      const fetchData = async () => {
        try {
          setLoading(true);
          setError(null);
          const queryDate = selectedDate || new Date().toISOString().split('T')[0];
          const response = await salesAPI.getWeeklyStats({ query_date: queryDate });
          
          if (response.data.success) {
            setApiData(response.data.data);
          } else {
            setError(response.data.message || '获取数据失败');
          }
        } catch (err: any) {
          setError(err.response?.data?.message || '网络请求失败');
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [refreshKey, selectedDate]);

  // 计算总计数据
  const calculateTotals = () => {
    if (!apiData) return null;
    
    const warehouses = apiData.warehouses;
    const totalVehicleConfig = warehouses.reduce((sum, w) => sum + w.car_count, 0);
    const totalWeekSalesCurrent = warehouses.reduce((sum, w) => sum + w.this_week_sales, 0);
    const totalWeekSalesPrevious = warehouses.reduce((sum, w) => sum + w.last_week_sales, 0);
    const salesChange = totalWeekSalesPrevious > 0 ? 
      ((totalWeekSalesCurrent - totalWeekSalesPrevious) / totalWeekSalesPrevious * 100) : 0;
    
    const totalDailyAvgCurrent = warehouses.reduce((sum, w) => sum + w.this_week_avg, 0);
    const totalDailyAvgPrevious = warehouses.reduce((sum, w) => sum + w.last_week_avg, 0);
    const avgChange = totalDailyAvgPrevious > 0 ? 
      ((totalDailyAvgCurrent - totalDailyAvgPrevious) / totalDailyAvgPrevious * 100) : 0;
    
    const totalWeekTripsCurrent = warehouses.reduce((sum, w) => sum + w.this_week_cart, 0);
    const totalWeekTripsPrevious = warehouses.reduce((sum, w) => sum + w.last_week_cart, 0);
    const tripsChange = totalWeekTripsPrevious > 0 ? 
      ((totalWeekTripsCurrent - totalWeekTripsPrevious) / totalWeekTripsPrevious * 100) : 0;
    
    const totalDailyTripsCurrent = warehouses.reduce((sum, w) => sum + w.this_daily_cart, 0);
    const totalDailyTripsPrevious = warehouses.reduce((sum, w) => sum + w.last_daily_cart, 0);
    const dailyTripsChange = totalDailyTripsPrevious > 0 ? 
      ((totalDailyTripsCurrent - totalDailyTripsPrevious) / totalDailyTripsPrevious * 100) : 0;

    return {
      vehicle_config: totalVehicleConfig.toString(),
      week_sales_current: totalWeekSalesCurrent,
      week_sales_previous: totalWeekSalesPrevious,
      week_sales_change: salesChange.toFixed(1),
      daily_avg_sales_current: Math.round(totalDailyAvgCurrent),
      daily_avg_sales_previous: Math.round(totalDailyAvgPrevious),
      daily_avg_sales_change: avgChange.toFixed(1),
      week_trips_current: totalWeekTripsCurrent,
      week_trips_previous: totalWeekTripsPrevious,
      week_trips_change: tripsChange.toFixed(1),
      daily_avg_trips_current: totalDailyTripsCurrent,
      daily_avg_trips_previous: totalDailyTripsPrevious,
      daily_avg_trips_change: dailyTripsChange.toFixed(1)
    };
  };

  const total = calculateTotals();

  // 处理仓库数据
  const processWarehouseData = () => {
    if (!apiData) return null;
    
    const warehouses = apiData.warehouses;
    return {
      names: warehouses.map(w => w.name),
      weeklySales: {
        current: warehouses.map(w => w.this_week_sales),
        previous: warehouses.map(w => w.last_week_sales),
        change: warehouses.map(w => parseFloat(w.sales_wow_pct.toFixed(1)))
      },
      dailyAverage: {
        current: warehouses.map(w => w.this_week_avg),
        previous: warehouses.map(w => w.last_week_avg),
        change: warehouses.map(w => parseFloat(w.avg_wow_pct.toFixed(1)))
      },
      weeklyTrips: {
        current: warehouses.map(w => w.this_week_cart),
        previous: warehouses.map(w => w.last_week_cart),
        change: warehouses.map(w => parseFloat(w.cart_wow_pct.toFixed(1)))
      },
      dailyTrips: {
        current: warehouses.map(w => w.this_daily_cart),
        previous: warehouses.map(w => w.last_daily_cart),
        change: warehouses.map(w => parseFloat(w.daily_cart_wow_pct.toFixed(1)))
      }
    };
  };

  // 处理市场数据（按城市聚合）
  const processMarketData = () => {
    if (!apiData) return null;
    
    const warehouses = apiData.warehouses;
    const marketMap = new Map<string, any>();
    
    warehouses.forEach(warehouse => {
      let marketName = '';
      if (warehouse.name.includes('重庆')) {
        marketName = '重庆市场';
      } else if (warehouse.name.includes('昆明')) {
        marketName = '昆明市场';
      } else if (warehouse.name.includes('成都')) {
        marketName = '成都市场';
      } else {
        marketName = '其他市场';
      }
      
      if (!marketMap.has(marketName)) {
        marketMap.set(marketName, {
          this_week_sales: 0,
          last_week_sales: 0,
          this_week_avg: 0,
          last_week_avg: 0,
          this_week_cart: 0,
          last_week_cart: 0,
          this_daily_cart: 0,
          last_daily_cart: 0,
          count: 0
        });
      }
      
      const market = marketMap.get(marketName);
      market.this_week_sales += warehouse.this_week_sales;
      market.last_week_sales += warehouse.last_week_sales;
      market.this_week_avg += warehouse.this_week_avg;
      market.last_week_avg += warehouse.last_week_avg;
      market.this_week_cart += warehouse.this_week_cart;
      market.last_week_cart += warehouse.last_week_cart;
      market.this_daily_cart += warehouse.this_daily_cart;
      market.last_daily_cart += warehouse.last_daily_cart;
      market.count += 1;
    });
    
    const markets = Array.from(marketMap.entries()).map(([name, data]) => ({
      name,
      ...data
    }));
    
    return {
      names: markets.map(m => m.name),
      weeklySales: {
        current: markets.map(m => m.this_week_sales),
        previous: markets.map(m => m.last_week_sales),
        change: markets.map(m => 
          m.last_week_sales > 0 ? 
          parseFloat(((m.this_week_sales - m.last_week_sales) / m.last_week_sales * 100).toFixed(1)) : 0
        )
      },
      dailyAverage: {
        current: markets.map(m => Math.round(m.this_week_avg)),
        previous: markets.map(m => Math.round(m.last_week_avg)),
        change: markets.map(m => 
          m.last_week_avg > 0 ? 
          parseFloat(((m.this_week_avg - m.last_week_avg) / m.last_week_avg * 100).toFixed(1)) : 0
        )
      },
      weeklyTrips: {
        current: markets.map(m => m.this_week_cart),
        previous: markets.map(m => m.last_week_cart),
        change: markets.map(m => 
          m.last_week_cart > 0 ? 
          parseFloat(((m.this_week_cart - m.last_week_cart) / m.last_week_cart * 100).toFixed(1)) : 0
        )
      },
      dailyTrips: {
        current: markets.map(m => m.this_daily_cart),
        previous: markets.map(m => m.last_daily_cart),
        change: markets.map(m => 
          m.last_daily_cart > 0 ? 
          parseFloat(((m.this_daily_cart - m.last_daily_cart) / m.last_daily_cart * 100).toFixed(1)) : 0
        )
      }
    };
  };

  // 早期返回处理加载和错误状态
  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card title="各仓周环比" className="mb-6" variant="outlined">
          <div className="flex justify-center items-center py-20">
            <Spin size="large" tip="加载中..." />
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card title="各仓周环比" className="mb-6" variant="outlined">
          <Alert
            message="数据加载失败"
            description={error}
            type="error"
            showIcon
            className="m-4"
          />
        </Card>
      </div>
    );
  }

  if (!apiData || !total) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card title="各仓周环比" className="mb-6" variant="outlined">
          <Alert
            message="暂无数据"
            description="无法获取统计数据，请稍后重试"
            type="warning"
            showIcon
            className="m-4"
          />
        </Card>
      </div>
    );
  }

  const warehouseData = processWarehouseData();
  const marketData = processMarketData();

  if (!warehouseData || !marketData) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card title="各仓周环比" className="mb-6" variant="outlined">
          <Alert
            message="数据处理失败"
            description="无法处理统计数据，请稍后重试"
            type="warning"
            showIcon
            className="m-4"
          />
        </Card>
      </div>
    );
  }

  const currentData = category === 'warehouse' ? warehouseData : marketData;
  const categoryText = category === 'warehouse' ? '仓' : '市场';

  const handleCategoryChange = (e: any) => {
    setCategory(e.target.value);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 各周环比栏目 */}
      <Card 
        title={`各${categoryText}周环比`} 
        className="mb-6" 
        variant="outlined"
        extra={
          <Radio.Group value={category} onChange={handleCategoryChange} buttonStyle="solid">
            <Radio.Button value="warehouse">仓库</Radio.Button>
            <Radio.Button value="market">市场</Radio.Button>
          </Radio.Group>
        }
      >
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 周销售总额 */}
            <div className="bg-white shadow rounded-lg p-3">
              <div className="text-gray-700 text-sm mb-1">周销售总额</div>
              <div className="flex justify-between items-center">
                <div className="text-gray-900 text-2xl font-bold">¥{total.week_sales_current.toLocaleString()}</div>
                <div className="bg-blue-50 p-2 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="flex items-center mt-1">
                <span className="text-gray-500 text-xs">上周: ¥{total.week_sales_previous.toLocaleString()}</span>
                <span className={`ml-2 px-1.5 py-0.5 text-xs rounded ${parseFloat(total.week_sales_change) >= 0 ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                  {parseFloat(total.week_sales_change) >= 0 ? '▲' : '▼'} {Math.abs(parseFloat(total.week_sales_change))}%
                </span>
              </div>
              <div className="mt-2">
                <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${total.week_sales_current / total.week_sales_previous >= 1 ? 'bg-green-500' : 'bg-red-500'}`} 
                       style={{ width: `${total.week_sales_current / total.week_sales_previous >= 1 ? '100%' : (total.week_sales_current / total.week_sales_previous * 100) + '%'}` }}></div>
                </div>
                <div className="text-gray-400 text-xs mt-1">单位: 元</div>
              </div>
            </div>

            {/* 日均销量 */}
            <div className="bg-white shadow rounded-lg p-3">
              <div className="text-gray-700 text-sm mb-1">日均销量</div>
              <div className="flex justify-between items-center">
                <div className="text-gray-900 text-2xl font-bold">¥{total.daily_avg_sales_current}</div>
                <div className="bg-pink-50 p-2 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-pink-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
              </div>
              <div className="flex items-center mt-1">
                <span className="text-gray-500 text-xs">上周: ¥{total.daily_avg_sales_previous}</span>
                <span className={`ml-2 px-1.5 py-0.5 text-xs rounded ${parseFloat(total.daily_avg_sales_change) >= 0 ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                  {parseFloat(total.daily_avg_sales_change) >= 0 ? '▲' : '▼'} {Math.abs(parseFloat(total.daily_avg_sales_change))}%
                </span>
              </div>
              <div className="mt-2">
                <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${total.daily_avg_sales_current / total.daily_avg_sales_previous >= 1 ? 'bg-green-500' : 'bg-red-500'}`} 
                       style={{ width: `${total.daily_avg_sales_current / total.daily_avg_sales_previous >= 1 ? '100%' : (total.daily_avg_sales_current / total.daily_avg_sales_previous * 100) + '%'}` }}></div>
                </div>
                <div className="text-gray-400 text-xs mt-1">单位: 元</div>
              </div>
            </div>

            {/* 周车次总量 */}
            <div className="bg-white shadow rounded-lg p-3">
              <div className="text-gray-700 text-sm mb-1">周车次总量</div>
              <div className="flex justify-between items-center">
                <div className="text-gray-900 text-2xl font-bold">{total.week_trips_current}</div>
                <div className="bg-cyan-50 p-2 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" />
                  </svg>
                </div>
              </div>
              <div className="flex items-center mt-1">
                <span className="text-gray-500 text-xs">上周: {total.week_trips_previous}</span>
                <span className={`ml-2 px-1.5 py-0.5 text-xs rounded ${parseFloat(total.week_trips_change) >= 0 ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                  {parseFloat(total.week_trips_change) >= 0 ? '▲' : '▼'} {Math.abs(parseFloat(total.week_trips_change))}%
                </span>
              </div>
              <div className="mt-2">
                <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${total.week_trips_current / total.week_trips_previous >= 1 ? 'bg-green-500' : 'bg-red-500'}`} 
                       style={{ width: `${total.week_trips_current / total.week_trips_previous >= 1 ? '100%' : (total.week_trips_current / total.week_trips_previous * 100) + '%'}` }}></div>
                </div>
                <div className="text-gray-400 text-xs mt-1">单位: 次</div>
              </div>
            </div>

            {/* 日均车次 */}
            <div className="bg-white shadow rounded-lg p-3">
              <div className="text-gray-700 text-sm mb-1">日均车次</div>
              <div className="flex justify-between items-center">
                <div className="text-gray-900 text-2xl font-bold">{total.daily_avg_trips_current}</div>
                <div className="bg-teal-50 p-2 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="flex items-center mt-1">
                <span className="text-gray-500 text-xs">上周: {total.daily_avg_trips_previous}</span>
                <span className={`ml-2 px-1.5 py-0.5 text-xs rounded ${parseFloat(total.daily_avg_trips_change) >= 0 ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                  {parseFloat(total.daily_avg_trips_change) >= 0 ? '▲' : '▼'} {Math.abs(parseFloat(total.daily_avg_trips_change))}%
                </span>
              </div>
              <div className="mt-2">
                <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${total.daily_avg_trips_current / total.daily_avg_trips_previous >= 1 ? 'bg-green-500' : 'bg-red-500'}`} 
                       style={{ width: `${total.daily_avg_trips_current / total.daily_avg_trips_previous >= 1 ? '100%' : (total.daily_avg_trips_current / total.daily_avg_trips_previous * 100) + '%'}` }}></div>
                </div>
                <div className="text-gray-400 text-xs mt-1">单位: 次</div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="w-full">
            <h3 className="text-lg font-medium mb-4 text-center">周销售</h3>
            <WeeklySalesChart 
              showCard={false} 
              names={currentData.names}
              currentData={currentData.weeklySales.current}
              previousData={currentData.weeklySales.previous}
              changeData={currentData.weeklySales.change}
            />
          </div>
          <div className="w-full">
            <h3 className="text-lg font-medium mb-4 text-center">周日均</h3>
            <DailyAverageChart 
              showCard={false} 
              names={currentData.names}
              currentData={currentData.dailyAverage.current}
              previousData={currentData.dailyAverage.previous}
              changeData={currentData.dailyAverage.change}
            />
          </div>
          <div className="w-full">
            <h3 className="text-lg font-medium mb-4 text-center">周车次</h3>
            <WeeklyTripsChart 
              showCard={false} 
              names={currentData.names}
              currentData={currentData.weeklyTrips.current}
              previousData={currentData.weeklyTrips.previous}
              changeData={currentData.weeklyTrips.change}
            />
          </div>
          <div className="w-full">
            <h3 className="text-lg font-medium mb-4 text-center">日均车次</h3>
            <DailyTripsChart 
              showCard={false} 
              names={currentData.names}
              currentData={currentData.dailyTrips.current}
              previousData={currentData.dailyTrips.previous}
              changeData={currentData.dailyTrips.change}
            />
          </div>
        </div>
      </Card>
      
      {/* 未来可以在这里添加更多栏目 */}
    </div>
  );
};

export default SalesCharts; 