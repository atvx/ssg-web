import React from 'react';
import ReactECharts from 'echarts-for-react';
import { Card } from 'antd';
import ClientOnly from '@/components/ui/ClientOnly';

interface DailyAverageChartProps {
  showCard?: boolean;
  names?: string[];
  currentData?: number[];
  previousData?: number[];
  changeData?: number[];
}

const DailyAverageChart: React.FC<DailyAverageChartProps> = ({ 
  showCard = true,
  names = [
    '重庆江北仓', '重庆渝北仓', '重庆三郎仓', '重庆大学城仓', '重庆北部仓',
    '重庆南岸仓', '重庆中央公园仓', '重庆北部新区仓',
    '昆明龙泉仓', '昆明广卫仓', '昆明世博仓', '成都高新仓'
  ],
  currentData = [358, 627, 572, 266, 368, 449, 615, 278, 237, 234, 272, 254],
  previousData = [375, 593, 654, 369, 357, 491, 508, 341, 260, 266, 192, 341],
  changeData = [-4.5, 5.7, -12.4, -28.0, 3.0, -8.6, 20.9, -18.4, -8.7, -12.0, 41.7, -25.4]
}) => {
  // 金额格式化函数
  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

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
            result += `${item.seriesName}: ${formatMoney(item.value)}<br/>`;
          }
        });
        return result;
      }
    },
    legend: {
      data: ['本周日均', '上周日均', '环比变化 (%)'],
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
        name: '日均销售额 (元)',
        nameTextStyle: { fontSize: 14, padding: [0, 0, 0, 10] },
        axisLabel: { 
          formatter: (value: number) => {
            if (value >= 1000) {
              return (value / 1000).toFixed(1) + 'k';
            }
            return value;
          }, 
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
        min: -60,
        max: 60,
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
        name: '本周日均',
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
          formatter: (params: any) => {
            return formatMoney(params.value).replace('¥', '');
          },
          fontSize: 12
        }
      },
      {
        name: '上周日均',
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
      <Card title="各仓周日均" className="mb-6" variant="outlined">
        {chartContent}
      </Card>
    );
  }

  return chartContent;
};

export default DailyAverageChart; 