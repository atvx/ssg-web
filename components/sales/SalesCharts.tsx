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