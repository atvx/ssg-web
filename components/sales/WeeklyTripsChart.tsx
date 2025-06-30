import React from 'react';
import ReactECharts from 'echarts-for-react';
import { Card } from 'antd';
import ClientOnly from '@/components/ui/ClientOnly';

interface WeeklyTripsChartProps {
  showCard?: boolean;
  names?: string[];
  currentData?: number[];
  previousData?: number[];
  changeData?: number[];
}

const WeeklyTripsChart: React.FC<WeeklyTripsChartProps> = ({ 
  showCard = true,
  names = [
    '重庆江北仓', '重庆渝北仓', '重庆三郎仓', '重庆大学城仓', '重庆北部仓',
    '重庆南岸仓', '重庆中央公园仓', '重庆北部新区仓',
    '昆明龙泉仓', '昆明广卫仓', '昆明世博仓', '成都高新仓'
  ],
  currentData = [83, 79, 54, 30, 46, 48, 23, 15, 45, 64, 38, 29],
  previousData = [76, 82, 54, 27, 34, 47, 19, 8, 54, 71, 40, 27],
  changeData = [9.2, -3.7, 0.0, 11.1, 35.3, 2.1, 21.1, 87.5, -16.7, -9.9, -5.0, 7.4]
}) => {
  const option = {
    title: {
      show: false
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      formatter: function (params: any) {
        let result = params[0].name + '<br/>';
        params.forEach((item: any) => {
          if (item.seriesType === 'line') {
            result += `${item.seriesName}: ${item.value}%<br/>`;
          } else {
            result += `${item.seriesName}: ${item.value}<br/>`;
          }
        });
        return result;
      }
    },
    legend: {
      data: ['本周车次', '上周车次', '环比变化 (%)'],
      top: 10,
      textStyle: { fontSize: 14 }
    },
    grid: {
      left: '12%',
      right: '18%',
      bottom: '10%',
      top: '60px',
      containLabel: true
    },
    xAxis: [
      {
        type: 'value',
        name: '车次',
        nameTextStyle: { fontSize: 14, padding: [0, 0, 0, 10] },
        axisLabel: { 
          formatter: '{value}',
          fontSize: 12 
        },
        splitLine: { show: true, lineStyle: { type: 'dashed', opacity: 0.3 } }
      },
      {
        type: 'value',
        name: '环比变化 (%)',
        nameTextStyle: { fontSize: 14, padding: [0, 10, 0, 0] },
        position: 'top',
        axisLabel: { formatter: '{value}%', fontSize: 12 },
        min: -40,
        max: 100,
        splitLine: { show: false }
      }
    ],
    yAxis: {
      type: 'category',
      data: names,
      inverse: true,
      axisLabel: { interval: 0, fontSize: 13, margin: 16 },
      axisTick: { show: true, alignWithLabel: true },
      axisLine: { show: true }
    },
    series: [
      {
        name: '本周车次',
        type: 'bar',
        data: currentData,
        itemStyle: { color: '#3498db' },
        barWidth: '40%',
        barGap: '10%',
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(52, 152, 219, 0.5)'
          }
        },
        label: {
          show: true,
          position: 'right',
          formatter: '{c}',
          fontSize: 12
        }
      },
      {
        name: '上周车次',
        type: 'bar',
        data: previousData,
        itemStyle: { color: '#1abc9c' },
        barWidth: '40%',
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(26, 188, 156, 0.5)'
          }
        },
        label: {
          show: false
        }
      },
      {
        name: '环比变化 (%)',
        type: 'line',
        xAxisIndex: 1,
        data: changeData,
        itemStyle: {
          color: (params: any) => params.data >= 0 ? '#27ae60' : '#e74c3c'
        },
        lineStyle: { color: '#5dade2', width: 3, shadowBlur: 5, shadowColor: 'rgba(93, 173, 226, 0.3)' },
        symbol: 'circle',
        symbolSize: 10,
        label: {
          show: true,
          position: 'right',
          formatter: '{c}%',
          fontSize: 12,
          fontWeight: 'bold',
          backgroundColor: 'rgba(255,255,255,0.7)',
          padding: [3, 5],
          borderRadius: 3
        }
      }
    ]
  };

  const chartContent = (
    <ClientOnly>
      <ReactECharts
        option={option}
        style={{ height: '500px' }}
        opts={{ renderer: 'svg' }}
      />
    </ClientOnly>
  );

  if (showCard) {
    return (
      <Card title="各仓周车次" className="mb-6" variant="outlined">
        {chartContent}
      </Card>
    );
  }

  return chartContent;
};

export default WeeklyTripsChart; 