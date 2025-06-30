import React, { useState, useEffect, useMemo } from 'react';
import { Card, Radio, Spin, Alert } from 'antd';
import { salesAPI } from '@/lib/api';
import ClientOnly from '@/components/ui/ClientOnly';
import * as echarts from 'echarts/core';
import { 
  BarChart, 
  LineChart,
  ScatterChart,
  PieChart,
  FunnelChart,
} from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// 注册ECharts组件
echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  BarChart,
  LineChart,
  ScatterChart,
  PieChart,
  FunnelChart,
  CanvasRenderer,
]);

interface MonthlySalesChartsProps {
  className?: string;
  selectedDate?: string;
}

interface MonthlyWarehouse {
  id: number;
  name: string;
  status: number;
  car_count: number;
  target_income: number;
  actual_income: number;
  ach_rate: number;
  per_car_income: number;
  sold_car_count: number;
}

interface MonthlyData {
  query_date: string;
  month_range: {
    start: string;
    end: string;
    year: number;
    month: number;
    label: string;
  };
  warehouses: MonthlyWarehouse[];
}

interface SalesRecord {
  id: number;
  name: string;
  status: number;
  date: string;
  sales_amount: number;
}

interface SalesRecordsData {
  query_date: string;
  date_range: {
    start: string;
    end: string;
    year: number;
    month: number;
    label: string;
  };
  records: SalesRecord[];
  summary: {
    total_records: number;
    total_amount: number;
    warehouses_count: number;
  };
}

type CategoryType = 'warehouse' | 'market';

const MonthlySalesCharts: React.FC<MonthlySalesChartsProps> = ({ className = '', selectedDate }) => {
  const [category, setCategory] = useState<CategoryType>('warehouse');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiData, setApiData] = useState<MonthlyData | null>(null);
  const [salesRecordsData, setSalesRecordsData] = useState<SalesRecordsData | null>(null);
  const [recordsLoading, setRecordsLoading] = useState(true);

  // 获取月度数据
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setRecordsLoading(true);
        setError(null);
        const queryDate = selectedDate || new Date().toISOString().split('T')[0];
        
        // 并行获取月度统计数据和销售记录数据
        const [monthlyResponse, recordsResponse] = await Promise.all([
          salesAPI.getMonthlyStats({ query_date: queryDate }),
          salesAPI.getSalesRecordsStats({ query_date: queryDate })
        ]);
        
        if (monthlyResponse.data?.code === 200 && monthlyResponse.data?.data) {
          setApiData(monthlyResponse.data.data);
        } else {
          setError(monthlyResponse.data?.message || '月度数据格式错误');
        }
        
        if (recordsResponse.data?.code === 200 && recordsResponse.data?.data) {
          setSalesRecordsData(recordsResponse.data.data);
        } else {
          console.warn('销售记录数据获取失败:', recordsResponse.data?.message);
        }
        
        setLoading(false);
        setRecordsLoading(false);
        
      } catch (err: any) {
        setError(err.response?.data?.message || '网络请求失败');
        setLoading(false);
        setRecordsLoading(false);
      }
    };

    fetchData();
  }, [selectedDate]);

  const handleCategoryChange = (e: any) => {
    setCategory(e.target.value);
  };

  // 计算统计数据
  const stats = useMemo(() => {
    if (!apiData?.warehouses) return null;
    
    const warehouses = apiData.warehouses.filter(w => w.status === 1); // 只显示活跃仓库
    const totalCarCount = warehouses.reduce((sum, w) => sum + w.car_count, 0);
    const totalTarget = warehouses.reduce((sum, w) => sum + w.target_income, 0);
    const totalActual = warehouses.reduce((sum, w) => sum + w.actual_income, 0);
    const totalAchRate = totalTarget > 0 ? (totalActual / totalTarget * 100) : 0;
    const totalPerCar = totalCarCount > 0 ? totalActual / totalCarCount : 0;
    const totalSoldCars = warehouses.reduce((sum, w) => sum + w.sold_car_count, 0);
    
    return {
      carCount: totalCarCount,
      targetIncome: totalTarget,
      actualIncome: totalActual,
      achRate: totalAchRate,
      perCarIncome: totalPerCar,
      soldCarCount: totalSoldCars,
    };
  }, [apiData]);

    // 生成运营健康度矩阵图表配置
  const matrixOption = useMemo(() => {
    if (!apiData?.warehouses) return null;
    
    const warehouses = apiData.warehouses.filter(w => w.status === 1);
    const actualIncomes = warehouses.map(w => w.actual_income);
    const perCarIncomes = warehouses.map(w => w.per_car_income);
    
    const matrixData = warehouses.map((w, i) => ({
      name: w.name,
      value: [actualIncomes[i], perCarIncomes[i]]
    }));
    
    const avgActualAmount = actualIncomes.reduce((a, b) => a + b, 0) / actualIncomes.length;
    const avgPerCarIncome = perCarIncomes.reduce((a, b) => a + b, 0) / perCarIncomes.length;
    
    return {
      title: { text: '运营健康度矩阵 (效率 vs 规模)', left: 'center' },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => `${params.data.name}<br/>实际金额: ${params.data.value[0].toLocaleString()}元<br/>车均收入: ${params.data.value[1]}元`
      },
      grid: { left: '10%', right: '15%', bottom: '15%', containLabel: true },
      xAxis: { 
        type: 'value', 
        name: '实际金额 (规模贡献)', 
        nameLocation: 'middle', 
        nameGap: 35, 
        splitLine: { show: false } 
      },
      yAxis: { 
        type: 'value', 
        name: '车均收入 (运营效率)', 
        nameLocation: 'middle', 
        nameGap: 50, 
        splitLine: { show: false } 
      },
      series: [{
        type: 'scatter',
        data: matrixData,
        symbolSize: 18,
        label: { show: true, position: 'bottom', formatter: '{b}' },
        // 定义平均线
        markLine: {
          silent: true,
          lineStyle: { type: 'dashed' },
          data: [
            { xAxis: avgActualAmount, name: '平均规模' },
            { yAxis: avgPerCarIncome, name: '平均效率' }
          ],
          label: { position: 'end', formatter: '{b}' }
        },
        // 定义四个象限区域和名称
        markArea: {
          silent: true,
          itemStyle: { color: 'rgba(0,0,0,0)', borderWidth: 1, borderType: 'dashed' },
          data: [
            // 左下: 待发展
            [{ name: '待发展区域', itemStyle:{color:'rgba(238, 102, 102, 0.1)'}, xAxis: 0, yAxis: 0 }, { xAxis: avgActualAmount, yAxis: avgPerCarIncome }],
            // 右下: 规模陷阱
            [{ name: '规模陷阱', itemStyle:{color:'rgba(250, 200, 88, 0.1)'}, xAxis: avgActualAmount, yAxis: 0 }, { xAxis: 'max', yAxis: avgPerCarIncome }],
            // 左上: 效率标杆
            [{ name: '效率标杆', itemStyle:{color:'rgba(145, 204, 117, 0.1)'}, xAxis: 0, yAxis: avgPerCarIncome }, { xAxis: avgActualAmount, yAxis: 'max' }],
            // 右上: 明星
            [{ name: '明星区域', itemStyle:{color:'rgba(84, 112, 198, 0.2)'}, xAxis: avgActualAmount, yAxis: avgPerCarIncome }, { xAxis: 'max', yAxis: 'max' }]
          ]
        }
      }]
    };
  }, [apiData]);

  // 生成运营效率排行榜图表配置（双向柱形图）
  const efficiencyOption = useMemo(() => {
    if (!apiData?.warehouses) return null;
    
    const warehouses = apiData.warehouses.filter(w => w.status === 1);
    
    // 按车均收入降序排列（高到低，从上到下显示）
    const sortedWarehouses = warehouses
      .map(w => ({ 
        name: w.name, 
        per_car_income: w.per_car_income,
        sold_car_count: w.sold_car_count
      }))
      .sort((a, b) => b.per_car_income - a.per_car_income);
    
    const warehouseNames = sortedWarehouses.map(item => item.name);
    const perCarIncomes = sortedWarehouses.map(item => item.per_car_income);
    const soldCarCounts = sortedWarehouses.map(item => item.sold_car_count);
    
    // 为了双向显示，将车均收入转换为负值（显示在左侧）
    const leftPerCarIncomes = perCarIncomes.map(value => -value);
    
    return {
      title: { text: '运营效率双向对比 (车均收入 vs 累计车次)', left: 'center' },
      tooltip: { 
        trigger: 'axis', 
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const name = params[0].axisValue;
          let result = `${name}<br/>`;
          params.forEach((param: any) => {
            if (param.seriesName === '车均收入') {
              result += `${param.seriesName}: ${Math.abs(param.value)} 元<br/>`;
            } else if (param.seriesName === '累计车次') {
              result += `${param.seriesName}: ${param.value} 次<br/>`;
            }
          });
          return result;
        }
      },
      legend: { 
        data: ['车均收入', '累计车次'], 
        top: 30 
      },
      grid: { left: '5%', right: '5%', bottom: '3%', top: '15%', containLabel: true },
      xAxis: { 
        type: 'value',
        splitLine: { show: false },
        axisLabel: {
          formatter: (value: number) => {
            return Math.abs(value).toString();
          }
        }
      },
      yAxis: { 
        type: 'category', 
        data: warehouseNames, 
        inverse: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          margin: 8,
          fontSize: 12
        }
      },
      series: [
        {
          name: '车均收入', 
          type: 'bar', 
          stack: 'total',
          data: leftPerCarIncomes,
          itemStyle: { 
            color: (params: any) => {
              const absValue = Math.abs(params.value);
              return absValue > 500 ? '#91CC75' : (absValue > 400 ? '#FAC858' : '#EE6666');
            }
          },
          label: { 
            show: true, 
            position: 'left', 
            formatter: (params: any) => `${Math.abs(params.value)} 元`,
            fontSize: 10
          }
        },
        {
          name: '累计车次', 
          type: 'bar', 
          stack: 'total',
          data: soldCarCounts,
          itemStyle: { color: '#5470C6' },
          label: { 
            show: true, 
            position: 'right', 
            formatter: '{c} 次',
            fontSize: 10
          }
        }
      ]
    };
  }, [apiData]);

  // 生成南丁格尔玫瑰图配置
  const roseOption = useMemo(() => {
    if (!apiData?.warehouses) return null;
    
    const warehouses = apiData.warehouses.filter(w => w.status === 1);
    
    // 按实际营收降序排列
    const roseData = warehouses
      .map(w => ({ name: w.name, value: w.actual_income }))
      .sort((a, b) => b.value - a.value);
    
    return {
      title: { text: '营收贡献度', left: 'center' },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: ¥{c} ({d}%)'
      },
      series: [
        {
          name: '实际营收',
          type: 'pie',
          radius: [20, 160],
          center: ['50%', '50%'],
          roseType: 'radius',
          itemStyle: {
            borderRadius: 5
          },
          label: {
            show: true,
            fontSize: 12,
            fontWeight: 'bold',
            formatter: '{b}\n¥{c}',
            position: 'outside',
            alignTo: 'edge',
            margin: 20
          },
          labelLine: {
            show: true,
            length: 15,
            length2: 0,
            maxSurfaceAngle: 80
          },
          emphasis: {
            label: {
              fontSize: 14,
              fontWeight: 'bold'
            }
          },
          data: roseData
        }
      ]
    };
  }, [apiData]);

  // 生成目标达成区间分布漏斗图配置
  const funnelOption = useMemo(() => {
    if (!apiData?.warehouses) return null;
    
    const warehouses = apiData.warehouses.filter(w => w.status === 1);
    
    // 统计各达成率区间的仓库数量和名称
    const highWarehouses: string[] = []; // 80%~100%达成
    const mediumWarehouses: string[] = []; // 50%~79%达成
    const lowWarehouses: string[] = []; // 0%~49%达成
    
    warehouses.forEach(w => {
      const rate = w.target_income === 0 ? 100 : w.ach_rate;
      if (rate >= 80) {
        highWarehouses.push(w.name);
      } else if (rate >= 50) {
        mediumWarehouses.push(w.name);
      } else {
        lowWarehouses.push(w.name);
      }
    });
    
    return {
      title: { 
        text: '达成率区间分布', 
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: { 
        trigger: 'item', 
        formatter: (params: any) => {
          const { name, value, percent } = params;
          let warehouseList = '';
          
          if (name.includes('优秀达成')) {
            warehouseList = highWarehouses.length > 0 ? 
              '<br/>仓库: ' + highWarehouses.join('、') : '<br/>暂无仓库';
          } else if (name.includes('良好达成')) {
            warehouseList = mediumWarehouses.length > 0 ? 
              '<br/>仓库: ' + mediumWarehouses.join('、') : '<br/>暂无仓库';
          } else if (name.includes('待改进')) {
            warehouseList = lowWarehouses.length > 0 ? 
              '<br/>仓库: ' + lowWarehouses.join('、') : '<br/>暂无仓库';
          }
          
          return `${name}<br/>数量: ${value} 个仓库<br/>占比: ${percent}%${warehouseList}`;
        }
      },
      color: ['#5470C6', '#91CC75', '#EE6666'],
      series: [{
        type: 'funnel',
        left: '10%',
        top: 80,
        width: '80%',
        height: '60%',
        minSize: '30%',
        maxSize: '100%',
        sort: 'none',
        gap: 2,
        data: [
          { 
            value: highWarehouses.length, 
            name: '优秀达成\n(80%~100%)',
            itemStyle: { color: '#5470C6' }
          },
          { 
            value: mediumWarehouses.length, 
            name: '良好达成\n(50%~79%)',
            itemStyle: { color: '#91CC75' }
          },
          { 
            value: lowWarehouses.length, 
            name: '待改进\n(0%~49%)',
            itemStyle: { color: '#EE6666' }
          }
        ],
        label: {
          show: true,
          position: 'inside',
          formatter: '{b}\n{c}个仓库',
          fontSize: 14,
          fontWeight: 'bold',
          color: '#fff'
        },
        labelLine: {
          show: false
        },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 2,
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.2)'
        },
        emphasis: {
          label: {
            fontSize: 16
          },
          itemStyle: {
            shadowBlur: 20,
            shadowColor: 'rgba(0, 0, 0, 0.4)'
          }
        }
      }]
    };
  }, [apiData]);

  // 生成目标vs实际营收图表配置
  const chartOption = useMemo(() => {
    if (!apiData?.warehouses) return null;
    
    const warehouses = apiData.warehouses
      .filter(w => w.status === 1); // 按接口返回的原始顺序
    
    const warehouseNames = warehouses.map(w => w.name);
    const actualIncomes = warehouses.map(w => w.actual_income);
    
    // 处理差额：如果目标为0，差额为0；否则为 max(目标-实际, 0)
    const gaps = warehouses.map(w => {
      if (w.target_income === 0) return 0;
      return Math.max(w.target_income - w.actual_income, 0);
    });
    
    // 处理达成率：如果目标为0，显示100%；否则显示实际达成率
    const achRates = warehouses.map(w => {
      if (w.target_income === 0) return 100;
      return w.ach_rate; // 显示真实达成率，包括超过100%的情况
    });
    
    const targetIncomes = warehouses.map(w => w.target_income);
    
    return {
      title: { 
        text: '各仓目标 vs 实际 & 达成率', 
        subtext: '目标 vs 实际 & 达成率', 
        left: 'center' 
      },
      tooltip: { 
        trigger: 'axis', 
        axisPointer: { type: 'cross' },
        formatter: (params: any) => {
          const warehouseIndex = warehouses.findIndex(w => w.name === params[0].axisValue);
          const warehouse = warehouses[warehouseIndex];
          const actual = warehouse.actual_income;
          const target = warehouse.target_income;
          const rate = target === 0 ? 100 : warehouse.ach_rate;
          const soldCars = warehouse.sold_car_count;
          
          return `
            ${warehouse.name}<br/>
            累计车次：${soldCars.toLocaleString()} 次<br/>
            目标：${target === 0 ? '无目标' : '¥' + target.toLocaleString()}<br/>
            实际：¥${actual.toLocaleString()}<br/>
            达成率：${rate.toFixed(1)}%
          `;
        }
      },
      legend: { 
        data: ['实际金额', '目标金额', '达成率'], 
        top: 'bottom' 
      },
      xAxis: [{ 
        type: 'category', 
        data: warehouseNames, 
        axisLabel: { interval: 0, rotate: 30 } 
      }],
      yAxis: [
        { 
          type: 'value', 
          name: '金额 (元)', 
          axisLabel: { formatter: '{value}' } 
        },
        { 
          type: 'value', 
          name: '达成率 (%)', 
          min: 0, 
          max: Math.max(120, Math.ceil(Math.max(...achRates) / 10) * 10), 
          axisLabel: { formatter: '{value} %' } 
        }
      ],
      grid: { bottom: '20%' },
      series: [
        { 
          name: '目标金额', 
          type: 'bar', 
          barGap: '-100%', 
          itemStyle: { color: '#E0E6F1' }, 
          data: targetIncomes 
        },
        { 
          name: '实际金额', 
          type: 'bar', 
          itemStyle: { color: '#5470C6' }, 
          data: actualIncomes 
        },
        { 
          name: '达成率', 
          type: 'line', 
          yAxisIndex: 1, 
          itemStyle: { color: '#FAC858' },
          markLine: { 
            data: [{ type: 'average', name: '平均达成率' }] 
          },
          data: achRates 
        }
      ]
    };
  }, [apiData]);

  // 生成动态排序柱状图配置和数据
  const areaStackedOption = useMemo(() => {
    if (!salesRecordsData?.records) return null;
    
    // 过滤活跃仓库的记录
    const activeRecords = salesRecordsData.records.filter(r => r.status === 1);
    
    // 获取所有日期并排序
    const allDates = Array.from(new Set(activeRecords.map(r => r.date))).sort();
    
    // 获取所有仓库名称
    const warehouseNames = Array.from(new Set(activeRecords.map(r => r.name)));
    
    // 仓库颜色配置
    const warehouseColors: Record<string, string> = {};
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#F4A460', '#87CEEB', '#FFB6C1', '#98FB98',
      '#FF9F40', '#9966FF', '#C9CBCF', '#4BC0C0', '#FF6384',
      '#36A2EB', '#FFCE56', '#E7E9ED', '#71B37C', '#518EE6',
      '#F7464A', '#46BFBD', '#FDB45C', '#949FB1', '#4D5360'
    ];
    warehouseNames.forEach((name, index) => {
      warehouseColors[name] = colors[index % colors.length];
    });
    
    // 计算累计收入数据，每日生成排序后的数据
    const dailyData: Record<string, Array<[number, string, number]>> = {};
     
    // 为每个仓库维护累计收入
    const cumulativeIncome: Record<string, number> = {};
    warehouseNames.forEach(name => {
      cumulativeIncome[name] = 0;
    });
     
    allDates.forEach(date => {
      const dayRecords = activeRecords.filter(r => r.date === date);
       
      // 更新当日的累计收入
      dayRecords.forEach(record => {
        cumulativeIncome[record.name] = (cumulativeIncome[record.name] || 0) + record.sales_amount;
      });
       
      // 获取所有仓库（包括累计收入为0的）
      const allWarehouses = warehouseNames.map(name => ({
        name,
        cumulativeAmount: cumulativeIncome[name] || 0
      }));
       
      // 按累计收入降序排序，并添加排名
      const sortedRecords = allWarehouses
        .sort((a, b) => b.cumulativeAmount - a.cumulativeAmount)
        .map((warehouse, index) => [
          warehouse.cumulativeAmount, // x轴：累计销售额
          warehouse.name,             // y轴：仓库名称
          index + 1                   // 排名（用于显示）
        ] as [number, string, number]);
       
      dailyData[date] = sortedRecords;
    });
    
    // 起始日期
    const startDate = allDates[0];
    
    return {
      grid: {
        top: 100,
        bottom: 80,
        left: 150,
        right: 120
      },
      xAxis: {
        max: 'dataMax',
        name: '累计销售额',
        nameLocation: 'middle',
        nameGap: 30,
        axisLabel: {
          formatter: (n: number) => `¥${Math.round(n).toLocaleString()}`
        }
      },
      dataset: {
        source: dailyData[startDate] || []
      },
      yAxis: {
        type: 'category',
        inverse: true,
        axisLabel: {
          show: true,
          fontSize: 12,
          formatter: (value: string) => value
        },
        animationDuration: 300,
        animationDurationUpdate: 300
      },
      series: [
        {
          realtimeSort: true,
          seriesLayoutBy: 'column',
          type: 'bar',
          itemStyle: {
            color: (param: any) => {
              return warehouseColors[param.value[1]] || '#5470c6';
            }
          },
          encode: {
            x: 0, // 销售额
            y: 1  // 仓库名称
          },
          label: {
            show: true,
            precision: 0,
            position: 'right',
            valueAnimation: true,
            fontFamily: 'monospace',
            formatter: (param: any) => `¥${param.value[0].toLocaleString()}`
          }
        }
      ],
      animationDuration: 0,
      animationDurationUpdate: 2000,
      animationEasing: 'linear',
      animationEasingUpdate: 'linear',
      graphic: {
        elements: [
          {
            type: 'text',
            right: 80,
            bottom: 140,
            style: {
              text: startDate.substring(5), // MM-DD格式
              font: 'bolder 48px monospace',
              fill: 'rgba(100, 100, 100, 0.25)'
            },
            z: 100
          }
        ]
      },
      title: {
         text: '销售额动态排名',
         subtext: '显示从月初至当日的累计收入变化，每2秒切换一天',
         left: 'center',
         top: 10
       },
       tooltip: {
         trigger: 'axis',
         axisPointer: {
           type: 'shadow'
         },
         formatter: (params: any) => {
           if (params.length > 0) {
             const param = params[0];
             return `${param.name}<br/>累计收入: ¥${param.value[0].toLocaleString()}<br/>当前排名: 第${param.value[2]}名`;
           }
           return '';
         }
       },
       // 存储所有日期数据，用于动画播放
       _dailyData: dailyData,
       _allDates: allDates
    };
  }, [salesRecordsData]);

  // ECharts组件
  const EChartsComponent: React.FC<{ option: any; height?: string }> = ({ option, height = '400px' }) => {
    const chartRef = React.useRef<HTMLDivElement>(null);
    const chartInstance = React.useRef<echarts.ECharts | null>(null);
    const animationTimers = React.useRef<NodeJS.Timeout[]>([]);
    const retryCount = React.useRef(0);
    const maxRetries = 10;

    // 启动动画播放
    const startAnimation = React.useCallback(() => {
      if (!option._dailyData || !option._allDates || !chartInstance.current) return;
      
      const chart = chartInstance.current;
      const dailyData = option._dailyData;
      const allDates = option._allDates;
      const updateFrequency = 2000; // 2秒更新一次

      // 清除之前的定时器
      animationTimers.current.forEach(timer => clearTimeout(timer));
      animationTimers.current = [];

      // 从第二个日期开始播放动画
      for (let i = 1; i < allDates.length; i++) {
        const currentDate = allDates[i];
        const currentData = dailyData[currentDate] || [];
        
        const timer = setTimeout(() => {
          if (chart && !chart.isDisposed()) {
            chart.setOption({
              dataset: {
                source: currentData
              },
              graphic: {
                elements: [
                  {
                    type: 'text',
                    right: 80,
                    bottom: 140,
                    style: {
                      text: currentDate.substring(5), // MM-DD格式
                      font: 'bolder 48px monospace',
                      fill: 'rgba(100, 100, 100, 0.25)'
                    },
                    z: 100
                  }
                ]
              }
            });
          }
        }, i * updateFrequency);
        
        animationTimers.current.push(timer);
      }
    }, [option]);

    // 检查 DOM 尺寸并初始化图表
    const initChart = React.useCallback(() => {
      if (!chartRef.current || !option) return;

      // 检查容器尺寸
      const container = chartRef.current;
      const { clientWidth, clientHeight } = container;
      
      // 如果尺寸为 0，延迟重试
      if (clientWidth === 0 || clientHeight === 0) {
        if (retryCount.current < maxRetries) {
          retryCount.current++;
          setTimeout(initChart, 150); // 150ms 后重试
          return;
        } else {
          console.warn('[ECharts] 容器尺寸为零，跳过初始化', {
            clientWidth,
            clientHeight
          });
          return;
        }
      }

      // 重置重试计数
      retryCount.current = 0;

      try {
        // 销毁已存在的实例
        if (chartInstance.current) {
          chartInstance.current.dispose();
          chartInstance.current = null;
        }

        // 创建新实例
        chartInstance.current = echarts.init(container);
        chartInstance.current.setOption(option);

        // 启动动画（如果需要）
        startAnimation();
      } catch (error) {
        console.error('[ECharts] 初始化失败:', error);
      }
    }, [option, startAnimation]);

    // 降级策略：强制初始化
    const forceInit = React.useCallback(() => {
      if (!chartRef.current || !option) return;
      
      try {
        // 销毁已存在的实例
        if (chartInstance.current) {
          chartInstance.current.dispose();
          chartInstance.current = null;
        }

        // 强制创建实例，即使尺寸检测失败
        chartInstance.current = echarts.init(chartRef.current);
        chartInstance.current.setOption(option);
        
        // 启动动画（如果需要）
        startAnimation();
        
        // 延迟 resize 确保正确显示
        setTimeout(() => {
          if (chartInstance.current && !chartInstance.current.isDisposed()) {
            chartInstance.current.resize();
          }
        }, 200);
        
        console.log('[ECharts] 降级策略：强制初始化成功');
      } catch (error) {
        console.error('[ECharts] 强制初始化失败:', error);
      }
    }, [option, startAnimation]);

    React.useEffect(() => {
      let isActive = true; // 组件是否仍处于活跃状态
      
      // 使用 requestAnimationFrame 确保 DOM 已完全渲染
      const initWithRAF = () => {
        requestAnimationFrame(() => {
          if (isActive) {
            // 再次延迟，确保容器尺寸已计算完成
            setTimeout(() => {
              if (isActive) {
                initChart();
              }
            }, 100);
          }
        });
      };

      initWithRAF();
      
      // 如果 2 秒后还没有成功初始化，使用降级策略
      const fallbackTimer = setTimeout(() => {
        if (isActive && !chartInstance.current && chartRef.current && option) {
          console.warn('[ECharts] 正常初始化超时，使用降级策略');
          forceInit();
        }
      }, 2000);

      return () => {
        isActive = false;
        clearTimeout(fallbackTimer);
        
        // 清除动画定时器
        animationTimers.current.forEach(timer => clearTimeout(timer));
        animationTimers.current = [];
        
        // 销毁图表实例
        if (chartInstance.current) {
          chartInstance.current.dispose();
          chartInstance.current = null;
        }
        
        // 重置重试计数
        retryCount.current = 0;
      };
    }, [initChart, forceInit]);

    React.useEffect(() => {
      const handleResize = () => {
        if (chartInstance.current && !chartInstance.current.isDisposed()) {
          // 延迟 resize 以确保容器尺寸已更新
          setTimeout(() => {
            if (chartInstance.current && !chartInstance.current.isDisposed()) {
              chartInstance.current.resize();
            }
          }, 100);
        }
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
      <div 
        ref={chartRef} 
        style={{ 
          width: '100%', 
          height, 
          minHeight: '200px', // 确保有最小高度
          position: 'relative' 
        }} 
      />
    );
  };

  // 早期返回处理加载和错误状态
  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card title="各仓月进度" className="mb-6" variant="outlined">
          <div className="flex justify-center items-center py-20">
            <Spin size="large" tip="加载中...">
              <div style={{ minHeight: 200 }} />
            </Spin>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card title="各仓月进度" className="mb-6" variant="outlined">
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

  if (!apiData) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card title="各仓月进度" className="mb-6" variant="outlined">
          <Alert
            message="暂无数据"
            description="无法获取月度统计数据，请稍后重试"
            type="warning"
            showIcon
            className="m-4"
          />
        </Card>
      </div>
    );
  }

  const categoryText = category === 'warehouse' ? '仓' : '市场';

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 各月进度栏目 */}
      <Card 
        title={`各${categoryText}月进度`} 
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* 车辆配置 */}
            <div className="bg-white shadow rounded-lg p-3">
              <div className="text-gray-700 text-sm mb-1">车辆配置</div>
              <div className="flex justify-between items-center">
                <div className="text-gray-900 text-2xl font-bold">{stats?.carCount || 0}</div>
                <div className="bg-purple-50 p-2 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm3 2h6v4H7V5zm8 8v2h1v-2h-1zm-2-2H7v4h6v-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="text-gray-400 text-xs mt-1">单位: 辆</div>
            </div>

            {/* 月度目标 */}
            <div className="bg-white shadow rounded-lg p-3">
              <div className="text-gray-700 text-sm mb-1">月度目标</div>
              <div className="flex justify-between items-center">
                <div className="text-gray-900 text-2xl font-bold">¥{stats?.targetIncome?.toLocaleString() || '0'}</div>
                <div className="bg-blue-50 p-2 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                  </svg>
                </div>
              </div>
              <div className="text-gray-400 text-xs mt-1">单位: 元</div>
            </div>

            {/* 实际营收 */}
            <div className="bg-white shadow rounded-lg p-3">
              <div className="text-gray-700 text-sm mb-1">实际营收</div>
              <div className="flex justify-between items-center">
                <div className="text-gray-900 text-2xl font-bold">¥{stats?.actualIncome?.toLocaleString() || '0'}</div>
                <div className="bg-green-50 p-2 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="text-gray-400 text-xs mt-1">单位: 元</div>
            </div>

            {/* 达成率 */}
            <div className="bg-white shadow rounded-lg p-3">
              <div className="text-gray-700 text-sm mb-1">达成率</div>
              <div className="flex justify-between items-center">
                <div className="text-gray-900 text-2xl font-bold">{stats?.achRate?.toFixed(1) || '0'}%</div>
                <div className="bg-orange-50 p-2 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                    <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                  </svg>
                </div>
              </div>
              <div className="mt-2">
                <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-400" style={{ width: `${Math.min(stats?.achRate || 0, 100)}%` }}></div>
                </div>
                <div className="text-gray-400 text-xs mt-1">目标完成度</div>
              </div>
            </div>

            {/* 车均 */}
            <div className="bg-white shadow rounded-lg p-3">
              <div className="text-gray-700 text-sm mb-1">车均</div>
              <div className="flex justify-between items-center">
                <div className="text-gray-900 text-2xl font-bold">¥{Math.round(stats?.perCarIncome || 0).toLocaleString()}</div>
                <div className="bg-cyan-50 p-2 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
              </div>
              <div className="text-gray-400 text-xs mt-1">单位: 元/辆</div>
            </div>

            {/* 销售车次 */}
            <div className="bg-white shadow rounded-lg p-3">
              <div className="text-gray-700 text-sm mb-1">销售车次</div>
              <div className="flex justify-between items-center">
                <div className="text-gray-900 text-2xl font-bold">{stats?.soldCarCount?.toLocaleString() || '0'}</div>
                <div className="bg-pink-50 p-2 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-pink-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" />
                  </svg>
                </div>
              </div>
              <div className="text-gray-400 text-xs mt-1">单位: 次</div>
            </div>
          </div>
        </div>

        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="w-full lg:col-span-2 hidden">
            {areaStackedOption && !recordsLoading && (
              <ClientOnly>
                <EChartsComponent option={areaStackedOption} height="800px" />
              </ClientOnly>
            )}
            {recordsLoading && (
              <Card className="h-96 flex items-center justify-center">
                <Spin size="large" tip="加载销售记录数据中...">
                  <div style={{ minHeight: 200 }} />
                </Spin>
              </Card>
            )}
            {!areaStackedOption && !recordsLoading && (
              <Card className="h-96 flex items-center justify-center">
                <Alert
                  message="暂无销售记录数据"
                  description="无法获取各仓销售记录，动态排名图表无法显示"
                  type="warning"
                  showIcon
                />
              </Card>
            )}
          </div>

          <div className="w-full">
            {roseOption && (
              <ClientOnly>
                <EChartsComponent option={roseOption} height="500px" />
              </ClientOnly>
            )}
          </div>
          
          <div className="w-full">
            {funnelOption && (
              <ClientOnly>
                <EChartsComponent option={funnelOption} height="400px" />
              </ClientOnly>
            )}
          </div>
          
          <div className="w-full">
            {chartOption && (
              <ClientOnly>
                <EChartsComponent option={chartOption} height="500px" />
              </ClientOnly>
            )}
          </div>
          
          <div className="w-full">
            {matrixOption && (
              <ClientOnly>
                <EChartsComponent option={matrixOption} height="500px" />
              </ClientOnly>
            )}
          </div>
          
          <div className="w-full lg:col-span-2">
            {efficiencyOption && (
              <ClientOnly>
                <EChartsComponent option={efficiencyOption} height="500px" />
              </ClientOnly>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MonthlySalesCharts; 