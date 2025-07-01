import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/router';
import { Table, Spin, Tag, Button, Popconfirm, message, Card, Space, Empty } from 'antd';
import { SalesRecord, SalesRecordListResponse } from '@/types/api';
import { EditOutlined, DeleteOutlined, ExclamationCircleOutlined, MoneyCollectOutlined, CarOutlined, ShopOutlined, CalendarOutlined, ClockCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { salesAPI } from '@/lib/api';

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

interface SalesDataTableProps {
  data?: SalesRecordListResponse | null;
  isLoading?: boolean;
  className?: string;
  onDelete?: () => void;
  onChange?: (pagination: any, filters: any, sorter: any, extra: any) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

const SalesDataTable: React.FC<SalesDataTableProps> = ({ 
  data, 
  isLoading = false, 
  className = 'bg-white rounded-xl shadow-md overflow-hidden',
  onDelete,
  onChange,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false
}) => {
  const router = useRouter();
  const isMobile = useIsMobile();

  // 处理删除销售记录
  const handleDelete = async (recordId: number) => {
    try {
      const response = await salesAPI.deleteSalesRecord(recordId);
      if (response.data.success) {
        message.success('销售记录删除成功');
        // 如果提供了删除后的回调函数，则调用
        if (onDelete) {
          onDelete();
        }
      } else {
        message.error(response.data.message || '删除失败');
      }
    } catch (error) {
      message.error('删除失败，请稍后再试');
    }
  };

  // 桌面端列配置
  const desktopColumns: ColumnsType<SalesRecord> = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      render: (_, __, index) => {
        const currentPage = data?.current || 1;
        const pageSize = data?.pageSize || 10;
        return (currentPage - 1) * pageSize + index + 1;
      },
    },
    {
      title: '仓库',
      dataIndex: 'warehouse_name',
      key: 'warehouse_name',
      render: (text) => text || '-',
      sorter: (a, b) => (a.warehouse_name || '').localeCompare(b.warehouse_name || ''),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      render: (text) => text || '-',
      sorter: (a, b) => new Date(a.date || '').getTime() - new Date(b.date || '').getTime(),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: '营业额',
      dataIndex: 'income_amt',
      key: 'income_amt',
      render: (amount) => amount ? `¥${amount}` : '¥0',
      sorter: (a, b) => parseFloat(a.income_amt || '0') - parseFloat(b.income_amt || '0'),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: '车次',
      dataIndex: 'sales_cart_count',
      key: 'sales_cart_count',
      render: (count) => count || '0',
      sorter: (a, b) => (a.sales_cart_count || 0) - (b.sales_cart_count || 0),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: '车均',
      dataIndex: 'avg_income_amt',
      key: 'avg_income_amt',
      render: (amount) => amount ? `¥${amount}` : '¥0',
      sorter: (a, b) => parseFloat(a.avg_income_amt || '0') - parseFloat(b.avg_income_amt || '0'),
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
      render: (text) => {
        if (text === 'duowei') {
          return <Tag color="#2db7f5">多维</Tag>;
        } else if (text === 'meituan') {
          return <Tag color="#ffd100" style={{ color: '#000000' }}>美团</Tag>;
        } else {
          return <Tag>{text || '未知'}</Tag>;
        }
      },
      sorter: (a, b) => {
        if (!a.platform && !b.platform) return 0;
        if (!a.platform) return -1;
        if (!b.platform) return 1;
        return a.platform.localeCompare(b.platform);
      },
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (text) => text ? format(new Date(text), 'MM-dd HH:mm') : '-',
      sorter: (a, b) => new Date(a.updated_at || '').getTime() - new Date(b.updated_at || '').getTime(),
      sortDirections: ['ascend', 'descend'],
      responsive: ['lg'], // 只在大屏幕上显示
    },

  ];

  // 移动端卡片渲染
  const renderMobileCards = () => {
    if (!data?.items || data.items.length === 0) {
      return (
        <Empty
          className="my-8"
          description="暂无数据"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    return (
      <div className="space-y-4">
        {/* 合计卡片 */}
        {data.summary && (
          <div className="sticky top-0 z-10 transition-shadow duration-200 summary-card">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg backdrop-blur-sm">
              <div className="text-lg font-medium mb-3 flex items-center">
                <span className="text-xl">合计</span>
                <div className="ml-auto text-sm opacity-80">共 {data.total || 0} 条</div>
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div className="flex flex-col items-start">
                  <div className="text-[28px] leading-[1.2] font-semibold tracking-tight">
                    ¥{Number(data.summary.income_amt || 0).toLocaleString('zh-CN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </div>
                  <div className="text-xs opacity-70">营业额</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-[28px] leading-[1.2] font-semibold tracking-tight">
                    {Number(data.summary.sales_cart_count || 0).toLocaleString('zh-CN', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    })}
                  </div>
                  <div className="text-xs opacity-70">车次</div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="text-[28px] leading-[1.2] font-semibold tracking-tight">
                    ¥{Number(data.summary.avg_income_amt || 0).toLocaleString('zh-CN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </div>
                  <div className="text-xs opacity-70">车均</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 数据卡片列表 */}
        <div className="space-y-3 mt-3">
          {data.items.map((record, index) => (
            <div 
              key={`${record.id || ''}-${record.date}-${record.warehouse_name}`}
              className="bg-white rounded-lg px-3 py-2.5 shadow-sm border border-gray-50"
            >
              {/* 第一行：仓库名称和日期 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[15px] font-medium text-gray-900">
                    {record.warehouse_name || '-'}
                  </span>
                  <Tag 
                    color={record.platform === 'duowei' ? 'blue' : 'warning'}
                    className="border-0 text-xs px-1.5 py-0 leading-[18px] h-[18px] m-0"
                  >
                    {record.platform === 'duowei' ? '多维' : '美团'}
                  </Tag>
                </div>
                <div className="text-xs text-gray-400">
                  {record.date}
                </div>
              </div>

              {/* 第二行：数据展示 */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="text-base font-medium text-gray-900">
                    ¥{Number(record.income_amt || 0).toLocaleString('zh-CN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </div>
                  <div className="text-[11px] text-gray-500">营业额</div>
                </div>
                <div>
                  <div className="text-base font-medium text-gray-900">
                    {Number(record.sales_cart_count || 0).toLocaleString('zh-CN', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    })}
                  </div>
                  <div className="text-[11px] text-gray-500">车次</div>
                </div>
                <div>
                  <div className="text-base font-medium text-gray-900">
                    ¥{Number(record.avg_income_amt || 0).toLocaleString('zh-CN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </div>
                  <div className="text-[11px] text-gray-500">车均</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 加载状态和提示 */}
        <div 
          ref={onLoadMore && hasMore ? (node) => {
            if (node) {
              const observer = new IntersectionObserver(
                ([entry]) => {
                  if (entry.isIntersecting && !isLoadingMore && hasMore) {
                    onLoadMore();
                  }
                },
                { 
                  threshold: 0.1,
                  rootMargin: '100px 0px'
                }
              );
              observer.observe(node);
              return () => observer.disconnect();
            }
          } : undefined}
          className="h-16 flex items-center justify-center"
        >
          {isLoadingMore && (
            <span className="text-sm text-gray-400">正在加载...</span>
          )}
          {!isLoadingMore && !hasMore && data.items.length > 0 && (
            <div className="flex items-center justify-center w-full py-2 text-gray-400">
              <div className="flex-1 h-[1px] bg-gray-200"></div>
              <span className="mx-4 whitespace-nowrap text-sm">没有更多数据了</span>
              <div className="flex-1 h-[1px] bg-gray-200"></div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={`text-center py-10 ${className}`}>
        <Spin size="large">
          <div className="mt-4 text-gray-500">载入中...</div>
        </Spin>
      </div>
    );
  }

  if (!data || !data.items || data.items.length === 0) {
    return (
      <div className={`text-center py-10 ${className}`}>
        <Empty
          description="暂无数据"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      {isMobile ? (
        renderMobileCards()
      ) : (
        // 桌面端表格布局
        <Table 
          columns={desktopColumns}
          dataSource={data.items}
          rowKey="id"
          pagination={false}
          className="shadow rounded-md"
          onChange={onChange}
          showSorterTooltip={false}
          scroll={{ 
            x: 'max-content',
            y: data.items && data.items.length > 15 ? 600 : undefined 
          }}
          summary={() => {
            if (!data.summary) return null;
            
            return (
              <Table.Summary fixed="top">
                <Table.Summary.Row className="bg-blue-50">
                  <Table.Summary.Cell index={0}>
                    <div className="text-gray-500">--</div>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>
                    <div className="font-medium text-gray-900">合计</div>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2}>
                    <div className="text-gray-500">--</div>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3}>
                    <div className="font-medium text-gray-900">
                      ¥{Number(data.summary.income_amt || 0).toLocaleString('zh-CN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </div>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4}>
                    <div className="font-medium text-gray-900">
                      {Number(data.summary.sales_cart_count || 0).toLocaleString('zh-CN', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      })}
                    </div>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5}>
                    <div className="font-medium text-gray-900">
                      ¥{Number(data.summary.avg_income_amt || 0).toLocaleString('zh-CN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </div>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6}>
                    <div className="text-gray-500">--</div>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={7}>
                    <div className="text-gray-500">--</div>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            );
          }}
        />
      )}
    </div>
  );
};

export default SalesDataTable; 