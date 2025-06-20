import React from 'react';
import ReactECharts from 'echarts-for-react';
import { Card } from 'antd';
import ClientOnly from '@/components/ui/ClientOnly';

interface WeeklySalesChartProps {
  showCard?: boolean;
  names?: string[];
  currentData?: number[];
  previousData?: number[];
  changeData?: number[];
}

const WeeklySalesChart: React.FC<WeeklySalesChartProps> = ({ 
  showCard = true,
  names = [
    '重庆江北仓', '重庆渝北仓', '重庆三郎仓', '重庆大学城仓', '重庆北部仓',
    '重庆南岸仓', '重庆中央公园仓', '重庆北部新区仓',
    '昆明龙泉仓', '昆明广卫仓', '昆明世博仓', '成都高新仓'
  ],
  currentData = [29732, 49543, 30901, 7972, 16930, 21542, 14134, 4175, 10681, 14953, 10328, 7373],
  previousData = [31545, 48648, 35289, 9971, 12152, 23088, 9658, 2732, 14047, 18891, 7697, 9205],
  changeData = [-5.7, 1.8, -12.4, -20.0, 39.3, -6.7, 46.3, 52.8, -24.0, -20.8, 34.2, -19.9]
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
      data: ['本周销售', '上周销售', '环比变化 (%)'],
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
        name: '销售额 (元)',
        nameTextStyle: { fontSize: 14, padding: [0, 0, 0, 10] },
        axisLabel: { 
          formatter: (value: number) => {
            if (value >= 10000) {
              return (value / 10000) + '万';
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
        name: '本周销售',
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
        name: '上周销售',
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
          color: (params: any) => params.data >= 0 ? '#e74c3c' : '#9b59b6'
        },
        lineStyle: { width: 3, shadowBlur: 5, shadowColor: 'rgba(0,0,0,0.2)' },
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
      <Card title="各仓周销售" className="mb-6" bordered={true}>
        {chartContent}
      </Card>
    );
  }

  return chartContent;
};

export default WeeklySalesChart; 