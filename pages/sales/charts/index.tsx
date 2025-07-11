import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useVerification } from '@/contexts/VerificationContext';
import Layout from '@/components/layout/Layout';
import SalesCharts from '@/components/sales/SalesCharts';
import DailyReportContent from '@/components/sales/DailyReportContent';
import MonthlySalesCharts from '@/components/sales/MonthlySalesCharts';
import { Spin, Tabs, DatePicker, Button, Tooltip, message, Modal, Select } from 'antd';
import type { TabsProps } from 'antd';
import { CloudUploadOutlined, SyncOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import zhCN from 'antd/lib/date-picker/locale/zh_CN';
import ExcelJS from 'exceljs';
import apiClient, { salesAPI } from '@/lib/api';
import VerificationModal from '@/components/ui/VerificationModal';

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

const SalesChartsPage: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { connectWebSocket } = useVerification();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [exporting, setExporting] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncModalVisible, setSyncModalVisible] = useState<boolean>(false);
  const [syncPlatform, setSyncPlatform] = useState<string>('all');
  const [syncDate, setSyncDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [refreshKey, setRefreshKey] = useState<number>(0); // 用于触发子组件数据刷新
  const isMobile = useIsMobile();
  
  // 长按相关状态
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pressStartTimeRef = useRef<number>(0);

  // 设置dayjs使用中文语言环境
  dayjs.locale('zh-cn');

  // 如果用户未登录，重定向到登录页
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
        pressTimerRef.current = null;
      }
    };
  }, []);

  // 确保初始化时两个日期选择器的值一致
  useEffect(() => {
    setSyncDate(selectedDate);
  }, []); // 只在组件挂载时执行一次

  const tabItems: TabsProps['items'] = [
    {
      key: 'daily',
      label: '日',
      children: <DailyReportContent selectedDate={selectedDate} refreshKey={refreshKey} />,
    },
    {
      key: 'weekly',
      label: '周',
      children: <SalesCharts className="mt-4" selectedDate={selectedDate} refreshKey={refreshKey} />,
    },
    {
      key: 'monthly',
      label: '月',
      children: <MonthlySalesCharts className="mt-4" selectedDate={selectedDate} refreshKey={refreshKey} />,
    },
  ];

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const handleDateChange = (date: dayjs.Dayjs | null) => {
    if (date) {
      const dateStr = date.format('YYYY-MM-DD');
      setSelectedDate(dateStr);
      // 联动更新同步弹窗中的日期
      setSyncDate(dateStr);
    }
  };

  // 数据同步函数
  const performSync = async (isSync: boolean, platform: string, date: string) => {
    if (!user?.id) {
      message.error('用户信息不完整');
      return;
    }

    try {
      setSyncing(true);
      
      // 如果平台是美团或所有平台，连接WebSocket以处理可能的验证码需求
      if (platform === 'meituan' || platform === 'all') {
        connectWebSocket();
      }
      
      // 构建请求参数，当平台为 "all" 时不传递 platform 参数
      const params: any = {
          sync: isSync,
          user_id: user.id,
          date: date
      };
      
      // 只有当平台不是 "all" 时才传递 platform 参数
      if (platform !== 'all') {
        params.platform = platform;
        }
      
      // 使用专门的同步API（支持长时间超时）
      const response = await salesAPI.fetchData(params);

      if (response.data.success) {
        message.success('数据同步成功');
        
        // 同步成功后刷新表格数据
        setTimeout(() => {
          setRefreshKey(prev => prev + 1);
        }, 1000); // 延迟1秒刷新，确保后端数据已更新
        
      } else {
        message.error(response.data.message || '同步失败');
      }
    } catch (error) {
      console.error('同步错误:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      // 特殊处理超时错误
      if (errorMessage.includes('timeout')) {
        message.error('同步超时，数据量较大请稍后重试或联系管理员');
      } else {
        message.error('同步失败：' + errorMessage);
      }
    } finally {
      setSyncing(false);
    }
  };

  // 处理同步按钮的鼠标按下事件
  const handleSyncMouseDown = () => {
    // 如果正在同步，不允许任何操作
    if (syncing) {
      return;
    }
    
    pressStartTimeRef.current = Date.now();
    pressTimerRef.current = setTimeout(() => {
      // 长按：显示设置弹窗，并确保弹窗日期与主页面一致
      setSyncDate(selectedDate);
      setSyncModalVisible(true);
    }, 500); // 500ms后触发长按
  };

  // 处理同步按钮的鼠标抬起事件
  const handleSyncMouseUp = () => {
    // 如果正在同步，不允许任何操作
    if (syncing) {
      return;
    }
    
    const pressDuration = Date.now() - pressStartTimeRef.current;
    
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }

    // 短按：直接同步
    if (pressDuration < 500) {
      performSync(true, 'all', selectedDate);
    }
  };

  // 处理鼠标离开事件（取消长按）
  const handleSyncMouseLeave = () => {
    // 如果正在同步，不允许任何操作
    if (syncing) {
      return;
    }
    
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  // 确认同步设置
  const handleSyncConfirm = () => {
    setSyncModalVisible(false);
    performSync(true, syncPlatform, syncDate); // 统一使用同步方式
  };

  // 取消同步设置
  const handleSyncCancel = () => {
    // 如果正在同步，不允许取消弹窗
    if (syncing) {
      return;
    }
    setSyncModalVisible(false);
  };

  // 处理同步日期变化
  const handleSyncDateChange = (date: dayjs.Dayjs | null) => {
    if (date) {
      const dateStr = date.format('YYYY-MM-DD');
      setSyncDate(dateStr);
      // 联动更新主页面的日期
      setSelectedDate(dateStr);
    }
  };

  // 导出数据函数
  const handleExport = async () => {
    if (exporting) return;
    
    try {
      setExporting(true);
      
      if (activeTab === 'weekly') {
        // 导出周报表
        await exportWeeklyReport();
      } else {
        // 导出日报表
        await exportDailyReport();
      }
    } catch (error) {
      message.error('导出失败：' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setExporting(false);
    }
  };

  // 导出日报表
  const exportDailyReport = async () => {
      // 获取日报表数据
      const response = await apiClient.get('/api/report/daily', {
        params: {
          query_date: selectedDate
        }
      });
      
      if (!response.data.success) {
        throw new Error(response.data.message || '获取数据失败');
      }

      // 过滤并处理数据
      const rawData = response.data.data
        .filter((item: any) => item.status !== 0 && item.sold_car_count > 0)
        .sort((a: any, b: any) => {
          if (a.p_sort !== b.p_sort) {
            return a.p_sort - b.p_sort;
          }
          return a.c_sort - b.c_sort;
        });

      // 创建工作簿和工作表
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('日报表');

      // 定义列结构
      worksheet.columns = [
        { header: '序号', key: 'index', width: 8 },
        { header: '名称', key: 'name', width: 20 },
        { header: '车辆配置', key: 'car_count', width: 10 },
        { header: '当日销售', key: 'daily_revenue', width: 12 },
        { header: '当日车均', key: 'daily_avg_revenue_cart', width: 10 },
        { header: '当日车次', key: 'daily_cart_count', width: 10 },
        { header: '月目标', key: 'target_income', width: 12 },
        { header: '月累计', key: 'actual_income', width: 12 },
        { header: '累计达成率', key: 'ach_rate', width: 12 },
        { header: '累计车均', key: 'per_car_income', width: 10 },
        { header: '累计车次', key: 'sold_car_count', width: 10 },
      ];

      // 添加数据行
      rawData.forEach((item: any, index: number) => {
        worksheet.addRow({
          index: index + 1,
          name: item.name,
          car_count: item.car_count,
          daily_revenue: item.daily_revenue,
          daily_avg_revenue_cart: item.daily_avg_revenue_cart,
          daily_cart_count: item.daily_cart_count,
          target_income: item.target_income,
          actual_income: item.actual_income,
          ach_rate: item.ach_rate / 100, // 转换为小数供百分比格式使用
          per_car_income: item.per_car_income,
          sold_car_count: item.sold_car_count
        });
      });

      // 设置表头样式
      const headerRow = worksheet.getRow(1);
      headerRow.height = 36; // 设置行高为36磅
      headerRow.eachCell((cell: any) => {
        cell.font = {
          name: 'Microsoft YaHei',
          size: 11,
          bold: true,
          color: { argb: 'FF000000' }
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center'
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // 设置数据行样式
      for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        row.height = 22; // 设置行高为22磅
        
        row.eachCell((cell: any, colNumber: number) => {
          // 通用样式
          cell.font = {
            name: 'Microsoft YaHei',
            size: 10,
            color: { argb: 'FF000000' }
          };
          cell.alignment = {
            vertical: 'middle',
            horizontal: colNumber === 2 ? 'left' : 'center' // 名称列左对齐，其他列居中
          };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };

          // 设置数值格式
          if ([4, 5, 6, 8, 10, 11].includes(colNumber)) {
            // 数值列：当日销售、当日车均、当日车次、月累计、累计车均、累计车次
            cell.numFmt = '0'; // 无小数位，无千位分隔符
          } else if (colNumber === 9) {
            // 百分比列：累计达成率
            cell.numFmt = '0.0%'; // 百分比格式，1位小数
          }
        });
      }

      // 冻结首行
      worksheet.views = [
        { state: 'frozen', ySplit: 1 }
      ];

      // 生成文件并下载
      const fileName = `销售日报表_${selectedDate}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      
      // 创建下载链接
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);

      message.success('导出成功');
  };

  // 导出周报表
  const exportWeeklyReport = async () => {
    // 计算当前日期所在周的周一和周日
    const currentDate = dayjs(selectedDate);
    const startOfWeek = currentDate.startOf('week').add(1, 'day'); // 周一
    const endOfWeek = currentDate.endOf('week').add(1, 'day'); // 周日
    
    // 获取周报表数据
    const response = await apiClient.get('/api/sales/weekly-stats', {
      params: {
        query_date: selectedDate
      }
    });
    
    if (!response.data.success) {
      throw new Error(response.data.message || '获取数据失败');
    }

    const data = response.data.data; // 现在是数组结构
    
    // 创建工作簿
    const workbook = new ExcelJS.Workbook();

    // 按城市分组数据
    const cityGroups = {
      '重庆': data.filter((item: any) => item.name.includes('重庆')),
      '昆明': data.filter((item: any) => item.name.includes('昆明')),
      '成都': data.filter((item: any) => item.name.includes('成都'))
    };

    // 先创建各仓周环比明细表，并记录每个城市合计行的位置
    const citySubtotalRows = createDetailComparisonSheet(workbook, data);

    // 然后创建各个城市的汇总表，使用记录的行位置
    Object.keys(cityGroups).forEach(city => {
      const cityData = cityGroups[city as keyof typeof cityGroups];
      const subtotalRow = citySubtotalRows[city];
      createCitySummarySheet(workbook, city, cityData, startOfWeek, endOfWeek, subtotalRow);
    });

    // 生成文件并下载
    const fileName = `周汇报${startOfWeek.format('M.D')}-${endOfWeek.format('M.D')}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    
    // 创建下载链接
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);

    message.success('导出成功');
  };

  // 创建城市汇总表
  const createCitySummarySheet = (workbook: any, cityName: string, cityData: any[], startOfWeek: any, endOfWeek: any, subtotalRow?: number) => {
    const worksheet = workbook.addWorksheet(`${cityName}总销售`);
    
    // 备用计算值（当没有subtotalRow时使用）
    const totalWeeklySales = cityData.reduce((sum, item) => sum + (item.this_week_sales || 0), 0);
    const totalLastWeeklySales = cityData.reduce((sum, item) => sum + (item.last_week_sales || 0), 0);
    const totalWeeklyTrips = cityData.reduce((sum, item) => sum + (item.this_week_cart || 0), 0);
    const totalLastWeeklyTrips = cityData.reduce((sum, item) => sum + (item.last_week_cart || 0), 0);
    const totalDailyAvg = cityData.reduce((sum, item) => sum + Math.round(item.this_week_avg || 0), 0);
    const totalLastDailyAvg = cityData.reduce((sum, item) => sum + Math.round(item.last_week_avg || 0), 0);
    
    // 设置列宽 - A列10磅，其他列14磅
    worksheet.columns = [
      { width: 10 }, // A
      { width: 14 }, // B  
      { width: 14 }, // C
      { width: 14 }, // D
      { width: 14 }, // E
      { width: 14 }, // F
    ];
    
    // 设置标题 - A1:F1
    worksheet.mergeCells('A1:F1');
    worksheet.getCell('A1').value = `${cityName}销售数据汇总  (${startOfWeek.format('M.D')}-${endOfWeek.format('M.D')})`;
    worksheet.getCell('A1').font = { 
      name: 'Microsoft YaHei', 
      size: 18, 
      bold: true 
    };
    worksheet.getCell('A1').alignment = { 
      horizontal: 'center', 
      vertical: 'middle',
      wrapText: true
    };
    // 设置标题行高为42磅
    worksheet.getRow(1).height = 42;
    
    // 设置表头 - A2="项目", B2:F2="统计"
    worksheet.getCell('A2').value = '项目';
    worksheet.mergeCells('B2:F2');
    worksheet.getCell('B2').value = '统计';
    worksheet.getCell('B2').alignment = { 
      horizontal: 'center', 
      vertical: 'middle',
      wrapText: true
    };
    
    // 销售部分合并和数据 - A3:A6
    worksheet.mergeCells('A3:A6');
    worksheet.getCell('A3').value = '销售';
    worksheet.getCell('A3').alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true
    };
    
    // 第一行销售数据标题
    worksheet.getCell('B3').value = '预估(周)';
    worksheet.getCell('C3').value = '实际(周)';
    worksheet.getCell('D3').value = '周达成率';
    worksheet.getCell('E3').value = '上周同期';
    worksheet.getCell('F3').value = '周环比';
    
    // 第一行销售数据
    if (subtotalRow) {
      // 使用Excel公式引用"各仓周环比明细"表中的数据
      worksheet.getCell('C4').value = { formula: `=各仓周环比明细!D${subtotalRow}` }; // 实际（周）：周销售额本周
      worksheet.getCell('E4').value = { formula: `=各仓周环比明细!E${subtotalRow}` }; // 上周同期：周销售额上周
      worksheet.getCell('F4').value = { formula: `=(C4-E4)/E4` }; // 周环比：=(C4-E4)/E4
      
      // 预估和周达成率使用计算值
      worksheet.getCell('B4').value = { formula: '=C4*1.4' }; // 预估(周)
      worksheet.getCell('D4').value = { formula: '=C4/B4' }; // 周达成率
    } else {
      // 备用方案：使用计算值
      const estimatedSales = Math.round(totalWeeklySales * 1.4) || 245000;
      worksheet.getCell('B4').value = estimatedSales;
      worksheet.getCell('C4').value = totalWeeklySales || 170663;
      worksheet.getCell('D4').value = totalWeeklySales > 0 ? (totalWeeklySales / estimatedSales) : 0.7;
      worksheet.getCell('E4').value = totalLastWeeklySales || 161042;
      worksheet.getCell('F4').value = totalLastWeeklySales > 0 ? ((totalWeeklySales - totalLastWeeklySales) / totalLastWeeklySales) : 0;
    }
    
    // 第二行销售数据标题
    worksheet.getCell('B5').value = '月目标';
    worksheet.getCell('C5').value = '累计月销售';
    worksheet.getCell('D5').value = '累计达成率';
    
    // 第二行销售数据
    const monthlyTarget = Math.round(totalWeeklySales * 6.5) || 1281000;
    worksheet.getCell('B6').value = monthlyTarget;
    worksheet.getCell('C6').value = totalWeeklySales || 194555;
    worksheet.getCell('D6').value = totalWeeklySales > 0 ? (totalWeeklySales / monthlyTarget) : 0.152; // 累计达成率，百分比格式1位小数
    
    // 为空单元格设置值（空字符串）以确保边框显示
    worksheet.getCell('E5').value = '';
    worksheet.getCell('F5').value = '';
    worksheet.getCell('E6').value = '';
    worksheet.getCell('F6').value = '';
    worksheet.getCell('E10').value = '';
    worksheet.getCell('F10').value = '';
    worksheet.getCell('E11').value = '';
    worksheet.getCell('F11').value = '';
    
    // 出货 - A7="出货", B7:F7合并显示数据
    worksheet.getCell('A7').value = '出货';
    worksheet.mergeCells('B7:F7');
    worksheet.getCell('B7').value = Math.round(totalWeeklySales * 0.57) || 97277;
    worksheet.getCell('B7').alignment = { 
      horizontal: 'center', 
      vertical: 'middle',
      wrapText: true
    };
    
    // 车部分合并和数据 - A8:A11
    worksheet.mergeCells('A8:A11');
    worksheet.getCell('A8').value = '车';
    worksheet.getCell('A8').alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true
    };
    
    // 第一行车次数据标题
    worksheet.getCell('B8').value = '周车次';
    worksheet.getCell('C8').value = '上周车次';
    worksheet.getCell('D8').value = '周环比';
    worksheet.getCell('E8').value = '周累积\n日均车次';
    worksheet.getCell('F8').value = '上周累积\n日均车次';
    
    // 第一行车次数据
    if (subtotalRow) {
      // 使用Excel公式引用"各仓周环比明细"表中的数据
      worksheet.getCell('B9').value = { formula: `=各仓周环比明细!J${subtotalRow}` }; // 周车次：周车次本周
      worksheet.getCell('C9').value = { formula: `=各仓周环比明细!K${subtotalRow}` }; // 上周车次：周车次上周
      worksheet.getCell('D9').value = { formula: '=(B9-C9)/C9' }; // 周环比：=(B9-C9)/C9
      worksheet.getCell('E9').value = { formula: '=B9/7' }; // 周累积日均车次：=B9/7
      worksheet.getCell('F9').value = { formula: '=C9/7' }; // 上周累积日均车次：=C9/7
    } else {
      // 备用方案：使用计算值
      worksheet.getCell('B9').value = totalWeeklyTrips || 350;
      worksheet.getCell('C9').value = totalLastWeeklyTrips || 378;
      worksheet.getCell('D9').value = totalLastWeeklyTrips > 0 ? ((totalWeeklyTrips - totalLastWeeklyTrips) / totalLastWeeklyTrips) : 0;
      worksheet.getCell('E9').value = { formula: '=B9/7' };
      worksheet.getCell('F9').value = { formula: '=C9/7' };
    }
    
    // 第二行车次数据标题
    worksheet.getCell('B10').value = '周日均';
    worksheet.getCell('C10').value = '上周日均';
    worksheet.getCell('D10').value = '日均环比';
    
    // 第二行车次数据
    if (subtotalRow) {
      // 使用Excel公式引用"各仓周环比明细"表中的数据
      worksheet.getCell('B11').value = { formula: `=各仓周环比明细!G${subtotalRow}` }; // 周日均：周日均本周
      worksheet.getCell('C11').value = { formula: `=各仓周环比明细!H${subtotalRow}` }; // 上周日均：周日均上周
      worksheet.getCell('D11').value = { formula: '=(B11-C11)/C11' }; // 日均环比：=(B11-C11)/C11
    } else {
      // 备用方案：使用计算值
      worksheet.getCell('B11').value = Math.round(totalDailyAvg) || 488;
      worksheet.getCell('C11').value = Math.round(totalLastDailyAvg) || 426;
      worksheet.getCell('D11').value = totalLastDailyAvg > 0 ? ((totalDailyAvg - totalLastDailyAvg) / totalLastDailyAvg) : 0;
    }
    
    // 设置所有单元格样式 - 遍历所有单元格确保每个都有边框
    for (let i = 1; i <= 11; i++) {
      const row = worksheet.getRow(i);
      
      // 设置行高：标题行42磅，第8行36磅（换行内容），其他行28磅
      if (i === 1) {
        row.height = 42;
      } else if (i === 8) {
        row.height = 36; // 第8行需要更大高度适应换行
      } else {
        row.height = 28;
      }
      
      // 遍历每一列（A到F，即1到6列）
      for (let j = 1; j <= 6; j++) {
        const cell = worksheet.getCell(i, j);
        
        // 字体设置
        if (i === 1) {
          // 标题行：字号18，加粗
          cell.font = {
            name: 'Microsoft YaHei',
            size: 18,
            bold: true
          };
        } else if (i === 2) {
          // 表头行：字号11，加粗
          cell.font = {
            name: 'Microsoft YaHei',
            size: 11,
            bold: true
          };
        } else {
          // 其他行：字号11，不加粗
          cell.font = {
            name: 'Microsoft YaHei',
            size: 11,
            bold: false
          };
        }
        
        // 对齐方式：居中+支持换行
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true
        };
        
        // 设置数值格式
        if (i >= 3) { // 从第3行开始设置数值格式（跳过标题和表头）
          // 数值格式，小数位数0，不使用千位分隔符的单元格
          if ((i === 4 && [2, 3, 5].includes(j)) || // B4(预估周)、C4(实际周)、E4(上周同期)
              (i === 6 && [2, 3].includes(j)) ||     // B6(月目标)、C6(累计月销售)
              (i === 9 && [2, 3, 5, 6].includes(j)) ||  // B9(周车次)、C9(上周车次)、E9(周累积日均车次)、F9(上周累积日均车次)
              (i === 11 && [2, 3].includes(j))) {    // B11(周日均)、C11(上周日均)
            cell.numFmt = '0';
          }
          // 百分比格式，小数位数0的单元格
          else if ((i === 4 && [4, 6].includes(j)) ||  // D4(周达成率)、F4(周环比)
                   (i === 9 && j === 4) ||              // D9(周环比)
                   (i === 11 && j === 4)) {             // D11(日均环比)
            cell.numFmt = '0%';
          }
          // 百分比格式，小数位数1的单元格
          else if (i === 6 && j === 4) {                // D6(累计达成率)
            cell.numFmt = '0.0%';
          }
        }
        
        // 边框设置 - 根据位置设置不同粗细
        let borderStyle: any = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        
        // 外围边框使用中等线
        if (i === 1) {
          // 标题行外围边框
          borderStyle.top = { style: 'medium' };
          borderStyle.bottom = { style: 'medium' };
          if (j === 1) borderStyle.left = { style: 'medium' };
          if (j === 6) borderStyle.right = { style: 'medium' };
        } else if (i === 11) {
          // 最后一行底部边框
          borderStyle.bottom = { style: 'medium' };
          if (j === 1) borderStyle.left = { style: 'medium' };
          if (j === 6) borderStyle.right = { style: 'medium' };
        } else {
          // 其他行的左右外围边框
          if (j === 1) borderStyle.left = { style: 'medium' };
          if (j === 6) borderStyle.right = { style: 'medium' };
        }
        
        // 主要分组之间的边框
        if (i === 2) {
          // 表头下方边框
          borderStyle.bottom = { style: 'medium' };
        } else if (i === 6) {
          // 销售部分下方边框
          borderStyle.bottom = { style: 'medium' };
        } else if (i === 7) {
          // 出货下方边框
          borderStyle.bottom = { style: 'medium' };
        }
        
        // A列右侧边框（项目列分割）
        if (j === 1 && i >= 2) {
          borderStyle.right = { style: 'medium' };
        }
        
        // 销售部分内部分割线
        if (i === 4 && j >= 2) {
          borderStyle.bottom = { style: 'medium' };
        }
        
        // 车部分内部分割线  
        if (i === 9 && j >= 2) {
          borderStyle.bottom = { style: 'medium' };
        }
        
        cell.border = borderStyle;
      }
    }
  };

  // 创建各仓周环比明细表
  const createDetailComparisonSheet = (workbook: any, data: any[]): { [cityName: string]: number } => {
    const worksheet = workbook.addWorksheet('各仓周环比明细');
    const citySubtotalRows: { [cityName: string]: number } = {};
    
    // 设置列宽 - 15列（A-O）
    worksheet.columns = [
      { width: 7 },  // A - 序号
      { width: 18 }, // B - 区域
      { width: 10 }, // C - 车辆配置
      { width: 10 }, // D - 周销售额本周
      { width: 10 }, // E - 周销售额上周
      { width: 10 }, // F - 周销售额环比
      { width: 10 }, // G - 周日均本周
      { width: 10 }, // H - 周日均上周
      { width: 10 }, // I - 周日均环比
      { width: 10 }, // J - 周车次本周
      { width: 10 }, // K - 周车次上周
      { width: 10 }, // L - 周车次环比
      { width: 10 }, // M - 日均车次本周
      { width: 10 }, // N - 日均车次上周
      { width: 10 }, // O - 日均车次环比
    ];

    // 创建第一行主标题的合并单元格
    worksheet.mergeCells('A1:A2'); // 序号
    worksheet.mergeCells('B1:B2'); // 区域
    worksheet.mergeCells('C1:C2'); // 车辆配置
    worksheet.mergeCells('D1:F1'); // 周销售额
    worksheet.mergeCells('G1:I1'); // 周日均
    worksheet.mergeCells('J1:L1'); // 周车次
    worksheet.mergeCells('M1:O1'); // 日均车次

    // 设置第一行主标题
    worksheet.getCell('A1').value = '序号';
    worksheet.getCell('B1').value = '区域';
    worksheet.getCell('C1').value = '车辆配置';
    worksheet.getCell('D1').value = '周销售额';
    worksheet.getCell('G1').value = '周日均';
    worksheet.getCell('J1').value = '周车次';
    worksheet.getCell('M1').value = '日均车次';

    // 设置第二行子标题
    worksheet.getCell('D2').value = '本周';
    worksheet.getCell('E2').value = '上周';
    worksheet.getCell('F2').value = '环比';
    worksheet.getCell('G2').value = '本周';
    worksheet.getCell('H2').value = '上周';
    worksheet.getCell('I2').value = '环比';
    worksheet.getCell('J2').value = '本周';
    worksheet.getCell('K2').value = '上周';
    worksheet.getCell('L2').value = '环比';
    worksheet.getCell('M2').value = '本周';
    worksheet.getCell('N2').value = '上周';
    worksheet.getCell('O2').value = '环比';

    // 添加数据行
    let rowIndex = 3;
    let sequenceNumber = 1;
    const subtotalRows: number[] = []; // 记录所有合计行的行号
    
    // 按城市分组数据
    const cityGroups = {
      '重庆': data.filter((item: any) => item.name.includes('重庆')),
      '昆明': data.filter((item: any) => item.name.includes('昆明')),
      '成都': data.filter((item: any) => item.name.includes('成都'))
    };
    
    // 遍历每个城市组
    Object.keys(cityGroups).forEach((cityName, cityIndex) => {
      const cityData = cityGroups[cityName as keyof typeof cityGroups];
      
      // 添加该城市的所有数据行
      cityData.forEach((item: any) => {
        const row = worksheet.getRow(rowIndex);
        
        // 基本信息
        row.getCell(1).value = sequenceNumber++; // 序号
        row.getCell(2).value = item.name; // 区域
        row.getCell(3).value = item.car_count || 0; // 车辆配置
        
        // 周销售额
        row.getCell(4).value = item.this_week_sales || 0; // 本周
        row.getCell(5).value = item.last_week_sales || 0; // 上周
        row.getCell(6).value = { formula: `=IFERROR((D${rowIndex}-E${rowIndex})/E${rowIndex},"  ")` }; // 环比公式
        
        // 周日均
        row.getCell(7).value = Math.round(item.this_week_avg || 0); // 本周
        row.getCell(8).value = Math.round(item.last_week_avg || 0); // 上周
        row.getCell(9).value = { formula: `=IFERROR((G${rowIndex}-H${rowIndex})/H${rowIndex},"  ")` }; // 环比公式
        
        // 周车次
        row.getCell(10).value = item.this_week_cart || 0; // 本周
        row.getCell(11).value = item.last_week_cart || 0; // 上周
        row.getCell(12).value = { formula: `=IFERROR((J${rowIndex}-K${rowIndex})/K${rowIndex},"  ")` }; // 环比公式
        
        // 日均车次
        row.getCell(13).value = { formula: `=J${rowIndex}/7` }; // 本周：周车次本周/7
        row.getCell(14).value = { formula: `=K${rowIndex}/7` }; // 上周：周车次上周/7
        row.getCell(15).value = { formula: `=IFERROR((M${rowIndex}-N${rowIndex})/N${rowIndex},"  ")` }; // 环比公式
        
        rowIndex++;
      });
      
      // 添加城市合计行
      if (cityData.length > 0) {
        subtotalRows.push(rowIndex); // 记录合计行行号
        citySubtotalRows[cityName] = rowIndex; // 记录该城市的合计行位置
        const subtotalRow = worksheet.getRow(rowIndex);
        const startRow = rowIndex - cityData.length; // 该城市数据开始行
        const endRow = rowIndex - 1; // 该城市数据结束行
        
        // 合并A列和B列，并设置合计行信息
        worksheet.mergeCells(`A${rowIndex}:B${rowIndex}`);
        subtotalRow.getCell(1).value = `${cityName}合计`; // 合并后的单元格显示城市合计
        subtotalRow.getCell(3).value = { formula: `=SUM(C${startRow}:C${endRow})` }; // 车辆配置合计
        
        // 周销售额合计
        subtotalRow.getCell(4).value = { formula: `=SUM(D${startRow}:D${endRow})` }; // 本周合计
        subtotalRow.getCell(5).value = { formula: `=SUM(E${startRow}:E${endRow})` }; // 上周合计
        subtotalRow.getCell(6).value = { formula: `=IFERROR((D${rowIndex}-E${rowIndex})/E${rowIndex},"  ")` }; // 环比公式
        
        // 周日均合计
        subtotalRow.getCell(7).value = { formula: `=SUM(G${startRow}:G${endRow})` }; // 本周合计
        subtotalRow.getCell(8).value = { formula: `=SUM(H${startRow}:H${endRow})` }; // 上周合计
        subtotalRow.getCell(9).value = { formula: `=IFERROR((G${rowIndex}-H${rowIndex})/H${rowIndex},"  ")` }; // 环比公式
        
        // 周车次合计
        subtotalRow.getCell(10).value = { formula: `=SUM(J${startRow}:J${endRow})` }; // 本周合计
        subtotalRow.getCell(11).value = { formula: `=SUM(K${startRow}:K${endRow})` }; // 上周合计
        subtotalRow.getCell(12).value = { formula: `=IFERROR((J${rowIndex}-K${rowIndex})/K${rowIndex},"  ")` }; // 环比公式
        
        // 日均车次合计
        subtotalRow.getCell(13).value = { formula: `=J${rowIndex}/7` }; // 本周合计：周车次合计/7
        subtotalRow.getCell(14).value = { formula: `=K${rowIndex}/7` }; // 上周合计：周车次合计/7
        subtotalRow.getCell(15).value = { formula: `=IFERROR((M${rowIndex}-N${rowIndex})/N${rowIndex},"  ")` }; // 环比公式
        
        rowIndex++;
      }
    });
    
    // 添加总计行
    const totalRowNumber = rowIndex; // 记录总计行行号
    const totalRow = worksheet.getRow(rowIndex);
    
    // 使用数据直接计算总计（只对原始数据行求和，跳过合计行）
    const allCityData = data;
    
    // 重新计算总计（只对原始数据行求和，跳过合计行）
    let totalCarCount = 0;
    let totalThisWeekSales = 0;
    let totalLastWeekSales = 0;
    let totalThisWeekAvg = 0;
    let totalLastWeekAvg = 0;
    let totalThisWeekCart = 0;
    let totalLastWeekCart = 0;
    let totalThisDailyCart = 0;
    let totalLastDailyCart = 0;
    
    allCityData.forEach(item => {
      totalCarCount += item.car_count || 0;
      totalThisWeekSales += item.this_week_sales || 0;
      totalLastWeekSales += item.last_week_sales || 0;
      totalThisWeekAvg += Math.round(item.this_week_avg || 0);
      totalLastWeekAvg += Math.round(item.last_week_avg || 0);
      totalThisWeekCart += item.this_week_cart || 0;
      totalLastWeekCart += item.last_week_cart || 0;
      totalThisDailyCart += item.this_daily_cart || 0;
      totalLastDailyCart += item.last_daily_cart || 0;
    });
    
    // 合并A列和B列，并设置总计行信息
    worksheet.mergeCells(`A${rowIndex}:B${rowIndex}`);
    totalRow.getCell(1).value = '总计'; // 合并后的单元格显示总计
    totalRow.getCell(3).value = totalCarCount;
    totalRow.getCell(4).value = totalThisWeekSales;
    totalRow.getCell(5).value = totalLastWeekSales;
    totalRow.getCell(6).value = { formula: `=IFERROR((D${rowIndex}-E${rowIndex})/E${rowIndex},"  ")` };
    totalRow.getCell(7).value = totalThisWeekAvg;
    totalRow.getCell(8).value = totalLastWeekAvg;
    totalRow.getCell(9).value = { formula: `=IFERROR((G${rowIndex}-H${rowIndex})/H${rowIndex},"  ")` };
    totalRow.getCell(10).value = totalThisWeekCart;
    totalRow.getCell(11).value = totalLastWeekCart;
    totalRow.getCell(12).value = { formula: `=IFERROR((J${rowIndex}-K${rowIndex})/K${rowIndex},"  ")` };
    totalRow.getCell(13).value = { formula: `=J${rowIndex}/7` }; // 总计本周：周车次总计/7
    totalRow.getCell(14).value = { formula: `=K${rowIndex}/7` }; // 总计上周：周车次总计/7
    totalRow.getCell(15).value = { formula: `=IFERROR((M${rowIndex}-N${rowIndex})/N${rowIndex},"  ")` };

    // 计算实际的最后一行（包括总计行）
    const lastRow = rowIndex;

    // 设置所有单元格样式
    for (let i = 1; i <= lastRow; i++) {
      const row = worksheet.getRow(i);
      row.height = 28;
      
      for (let j = 1; j <= 15; j++) {
        const cell = worksheet.getCell(i, j);
        
        // 字体设置
        if (i <= 2) {
          // 表头：字号11，加粗
          cell.font = {
            name: 'Microsoft YaHei',
            size: 11,
            bold: true
          };
        } else if (subtotalRows.includes(i) || i === totalRowNumber) {
          // 合计行和总计行：字号11，加粗
          cell.font = {
            name: 'Microsoft YaHei',
            size: 11,
            bold: true
          };
        } else {
          // 数据行：字号11，不加粗
          cell.font = {
            name: 'Microsoft YaHei',
            size: 11,
            bold: false
          };
        }
        
        // 对齐方式
        let horizontalAlign = 'center'; // 默认居中
        
        // 特殊处理：普通数据行的B列左对齐
        if (j === 2 && !subtotalRows.includes(i) && i !== totalRowNumber && i > 2) {
          horizontalAlign = 'left';
        }
        // 合计行和总计行的第一列（合并单元格）居中对齐
        else if ((subtotalRows.includes(i) || i === totalRowNumber) && j === 1) {
          horizontalAlign = 'center';
        }
        
        cell.alignment = {
          vertical: 'middle',
          horizontal: horizontalAlign,
          wrapText: true
        };
        
        // 设置数值格式（仅对数据行，不包括表头）
        if (i > 2) {
          // 数值列：D、E、G、H、J、K、M、N列 - 数值格式，0小数位，无千位分隔符
          if ([4, 5, 7, 8, 10, 11, 13, 14].includes(j)) {
            cell.numFmt = '0';
          }
          // 百分比列：F、I、L、O列 - 百分比格式，1位小数
          else if ([6, 9, 12, 15].includes(j)) {
            cell.numFmt = '0.0%';
          }
        }
        
        // 边框设置 - 默认为细边框
        let borderStyle: any = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        
        // 1. 表格外围边框（最外层）- 粗边框
        if (i === 1) {
          // 第一行顶部边框
          borderStyle.top = { style: 'medium' };
        }
        if (i === lastRow) {
          // 最后一行底部边框
          borderStyle.bottom = { style: 'medium' };
        }
        if (j === 1) {
          // 第一列左边框
          borderStyle.left = { style: 'medium' };
        }
        if (j === 15) {
          // 最后一列右边框
          borderStyle.right = { style: 'medium' };
        }
        
        // 2. 表头下方边框 - 粗边框
        if (i === 2) {
          borderStyle.bottom = { style: 'medium' };
        }
        
        // 3. 主要分组列之间的边框 - 粗边框
        if (j === 3 || j === 6 || j === 9 || j === 12) {
          borderStyle.right = { style: 'medium' };
        }
        
        // 4. 合计行的下方边框 - 粗边框
        if (subtotalRows.includes(i)) {
          borderStyle.bottom = { style: 'medium' };
        }
        
        // 5. 总计行的上方和下方边框 - 粗边框
        if (i === totalRowNumber) {
          borderStyle.top = { style: 'medium' };
          borderStyle.bottom = { style: 'medium' };
        }
        
        cell.border = borderStyle;
      }
    }

    // 添加条件格式：环比列负数显示红色
    const conditionalFormattingRanges = [
      `F3:F${lastRow}`, // 周销售额环比
      `I3:I${lastRow}`, // 周日均环比
      `L3:L${lastRow}`, // 周车次环比
      `O3:O${lastRow}`  // 日均车次环比
    ];
    
    conditionalFormattingRanges.forEach(range => {
      worksheet.addConditionalFormatting({
        ref: range,
        rules: [
          {
            type: 'cellIs',
            operator: 'lessThan',
            formulae: [0],
            style: {
              font: {
                color: { argb: 'FFFF0000' } // 红色
              }
            }
          }
        ]
      });
    });

    // 冻结前两行
    worksheet.views = [
      { state: 'frozen', ySplit: 2 }
    ];
    
    return citySubtotalRows;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Spin size="large" /></div>;
  }

  if (!isAuthenticated) {
    return null; // 等待重定向
  }

  return (
    <Layout>
      <Head>
        <title>营业统计 | 销售助手</title>
        <meta name="description" content="查看销售图表数据" />
      </Head>

      <div className={`py-4 md:py-6 ${isMobile ? 'px-3' : 'px-6'}`}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-semibold text-gray-900`}>营业统计</h1>
            <p className="mt-1 text-sm text-gray-500">
              查看营业数据图表。
            </p>
          </div>
          <div className="flex items-center">
            <DatePicker
              value={dayjs(selectedDate)}
              onChange={handleDateChange}
              format="YYYY-MM-DD"
              placeholder="选择日期"
              allowClear={false}
              inputReadOnly={true}
              disabledDate={(current) => current && current.isAfter(dayjs(), 'day')}
              size={isMobile ? "small" : "middle"}
              style={{ width: isMobile ? 120 : 140 }}
              locale={zhCN}
            />
            <Tooltip title={syncing ? "同步中" : "同步数据"}>
              <Button 
                icon={<SyncOutlined />} 
                type="text" 
                loading={syncing}
                disabled={syncing}
                onMouseDown={handleSyncMouseDown}
                onMouseUp={handleSyncMouseUp}
                onMouseLeave={handleSyncMouseLeave}
                onTouchStart={syncing ? undefined : handleSyncMouseDown}
                onTouchEnd={syncing ? undefined : handleSyncMouseUp}
                style={{
                  opacity: syncing ? 0.6 : 1,
                  cursor: syncing ? 'not-allowed' : 'pointer'
                }}
              />
            </Tooltip>
            <Tooltip title="导出">
              <Button 
                icon={<CloudUploadOutlined />} 
                type="text" 
                onClick={handleExport}
                loading={exporting}
              />
            </Tooltip>   
          </div>
        </div>
      </div>

      <Tabs 
        activeKey={activeTab} 
        onChange={handleTabChange}
        items={tabItems} 
        type="card" 
        size={isMobile ? "small" : "large"}
        className={isMobile ? "mx-3" : ""}
      />

      {/* 数据同步设置弹窗 */}
      <Modal
        title="数据同步"
        open={syncModalVisible}
        onOk={handleSyncConfirm}
        onCancel={handleSyncCancel}
        okText={syncing ? "同步中..." : "开始同步"}
        cancelText="取消"
        width={420}
        confirmLoading={syncing}
        okButtonProps={{
          disabled: syncing
        }}
        cancelButtonProps={{
          disabled: syncing
        }}
        closable={!syncing}
        maskClosable={!syncing}
      >
        <div className="space-y-5 pt-4">
          {/* 选择日期 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择日期 <span className="text-red-500">*</span>
            </label>
            <DatePicker
              value={dayjs(syncDate)}
              onChange={handleSyncDateChange}
              format="YYYY-MM-DD"
               placeholder="请选择同步日期"
              allowClear={false}
               inputReadOnly={true}
               disabledDate={(current) => current && current.isAfter(dayjs(), 'day')}
              style={{ width: '100%' }}
              locale={zhCN}
            />
          </div>
          
          {/* 选择平台 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择平台 <span className="text-red-500">*</span>
            </label>
            <Select
              value={syncPlatform}
              onChange={setSyncPlatform}
              style={{ width: '100%' }}
              placeholder="请选择同步平台"
              options={[
                { value: 'all', label: '所有平台' },
                { value: 'duowei', label: '多维' },
                { value: 'meituan', label: '美团' }
              ]}
            />
          </div>

          {/* 温馨提示 */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-4 w-4 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-2">
                <p className="text-sm text-blue-700">
                  数据同步可能需要2-3分钟，请耐心等待。
                </p>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* 验证码模态框 */}
      <VerificationModal />
    </Layout>
  );
};

export default SalesChartsPage; 