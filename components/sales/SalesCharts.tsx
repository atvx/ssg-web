import React, { useState } from 'react';
import { Card, Radio } from 'antd';
import WeeklySalesChart from './WeeklySalesChart';
import DailyAverageChart from './DailyAverageChart';
import WeeklyTripsChart from './WeeklyTripsChart';
import DailyTripsChart from './DailyTripsChart';

interface SalesChartsProps {
  className?: string;
}

type CategoryType = 'warehouse' | 'market';

const SalesCharts: React.FC<SalesChartsProps> = ({ className = '' }) => {
  const [category, setCategory] = useState<CategoryType>('warehouse');

  // 总计数据
  const total = {
    "vehicle_config": "130",
    "week_sales_current": 218265,
    "week_sales_previous": 222922,
    "week_sales_change": "-2.1",
    "daily_avg_sales_current": 394,
    "daily_avg_sales_previous": 414,
    "daily_avg_sales_change": "-4.7",
    "week_trips_current": 554,
    "week_trips_previous": 539,
    "week_trips_change": "2.8",
    "daily_avg_trips_current": 79,
    "daily_avg_trips_previous": 77,
    "daily_avg_trips_change": "2.8"
  };

  // 仓库数据 - 真实数据
  const warehouseData = {
    names: [
      '重庆江北仓', '重庆渝北仓', '重庆三郎仓', '重庆大学城仓', '重庆北部仓',
      '重庆南岸仓', '重庆中央公园仓', '重庆北部新区仓',
      '昆明龙泉仓', '昆明广卫仓', '昆明世博仓', '成都高新仓'
    ],
    weeklySales: {
      current: [29732, 49543, 30901, 7972, 16930, 21542, 14134, 4175, 10681, 14953, 10328, 7373],
      previous: [31545, 48648, 35289, 9971, 12152, 23088, 9658, 2732, 14047, 18891, 7697, 9205],
      change: [-5.7, 1.8, -12.4, -20.0, 39.3, -6.7, 46.3, 52.8, -24.0, -20.8, 34.2, -19.9]
    },
    dailyAverage: {
      current: [358, 627, 572, 266, 368, 449, 615, 278, 237, 234, 272, 254],
      previous: [375, 593, 654, 369, 357, 491, 508, 341, 260, 266, 192, 341],
      change: [-4.5, 5.7, -12.4, -28.0, 3.0, -8.6, 20.9, -18.4, -8.7, -12.0, 41.7, -25.4]
    },
    weeklyTrips: {
      current: [83, 79, 54, 30, 46, 48, 23, 15, 45, 64, 38, 29],
      previous: [76, 82, 54, 27, 34, 47, 19, 8, 54, 71, 40, 27],
      change: [9.2, -3.7, 0.0, 11.1, 35.3, 2.1, 21.1, 87.5, -16.7, -9.9, -5.0, 7.4]
    },
    dailyTrips: {
      current: [12, 11, 8, 4, 7, 7, 3, 2, 6, 9, 5, 4],
      previous: [11, 12, 8, 4, 5, 7, 3, 1, 8, 10, 6, 4],
      change: [9.2, -3.7, 0.0, 11.1, 35.3, 2.1, 21.1, 87.5, -16.7, -9.9, -5.0, 7.4]
    }
  };

  // 市场数据 - 模拟数据
  const marketData = {
    names: ['重庆市场', '昆明市场', '成都市场'],
    weeklySales: {
      current: [215929, 35962, 7373],
      previous: [205083, 40635, 9205],
      change: [5.3, -11.5, -19.9]
    },
    dailyAverage: {
      current: [3085, 514, 254],
      previous: [2930, 580, 341],
      change: [5.3, -11.5, -25.4]
    },
    weeklyTrips: {
      current: [378, 147, 29],
      previous: [347, 165, 27],
      change: [8.9, -10.9, 7.4]
    },
    dailyTrips: {
      current: [54, 21, 4],
      previous: [50, 24, 4],
      change: [8.0, -12.5, 0.0]
    }
  };

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