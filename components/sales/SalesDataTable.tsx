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
}

const SalesDataTable: React.FC<SalesDataTableProps> = ({ 
  data, 
  isLoading = false, 
  className = 'bg-white rounded-xl shadow-md overflow-hidden',
  onDelete,
  onChange
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
      <div className="space-y-3">
        {data.items.map((record) => {
          // 平台标签
          let platformTag;
          if (record.platform === 'duowei') {
            platformTag = <Tag color="#2db7f5">多维</Tag>;
          } else if (record.platform === 'meituan') {
            platformTag = <Tag color="#ffd100" style={{ color: '#000000' }}>美团</Tag>;
          } else {
            platformTag = <Tag>{record.platform || '未知'}</Tag>;
          }

          return (
            <div 
              key={record.id} 
              className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-200 overflow-hidden"
            >
              <div className="p-5">
                {/* 头部：仓库名称和平台 */}
                <div className="flex justify-between items-center mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      {record.warehouse_name || '-'}
                    </h3>
                    <div className="text-sm text-gray-500">
                      {record.date || '-'}
                    </div>
                  </div>
                  <div className="ml-4">
                    {platformTag}
                  </div>
                </div>

                {/* 数据展示 */}
                <div className="grid grid-cols-3 gap-4 mb-5">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      ¥{parseFloat(record.income_amt || '0').toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">营业额</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {record.sales_cart_count || '0'}
                    </div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">车次</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      ¥{parseFloat(record.avg_income_amt || '0').toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">车均</div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <div className="flex items-center text-xs text-gray-400">
                    <ClockCircleOutlined className="mr-1" />
                    {record.updated_at ? (() => {
                      const updateTime = new Date(record.updated_at);
                      const today = new Date();
                      const yesterday = new Date(today);
                      yesterday.setDate(today.getDate() - 1);
                      
                      // 判断是否为今天
                      if (updateTime.toDateString() === today.toDateString()) {
                        return `更新于 ${format(updateTime, 'HH:mm')}`;
                      }
                      // 判断是否为昨天
                      else if (updateTime.toDateString() === yesterday.toDateString()) {
                        return `更新于 昨天 ${format(updateTime, 'HH:mm')}`;
                      }
                      // 判断是否为今年
                      else if (updateTime.getFullYear() === today.getFullYear()) {
                        return `更新于 ${format(updateTime, 'MM-dd HH:mm')}`;
                      }
                      // 去年或更早
                      else {
                        return `更新于 ${format(updateTime, 'yyyy-MM-dd HH:mm')}`;
                      }
                    })() : '更新于 -'}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => router.push(`/sales/data/edit/${record.id}`)}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <EditOutlined className="mr-1" />
                      编辑
                    </button>
                    <Popconfirm
                      title="确定要删除此销售记录吗?"
                      description="删除后无法恢复!"
                      icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
                      onConfirm={() => handleDelete(record.id)}
                      okText="是"
                      cancelText="否"
                    >
                      <button className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-500 hover:text-red-600 transition-colors">
                        <DeleteOutlined className="mr-1" />
                        删除
                      </button>
                    </Popconfirm>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
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
        // 移动端卡片布局
        <div>
          {renderMobileCards()}
          {/* 移动端合计显示 */}
          {data.summary && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 mt-4 p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">合计</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    ¥{parseFloat(data.summary.income_amt || '0').toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">营业额</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {parseInt(data.summary.sales_cart_count || '0').toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">车次</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    ¥{parseFloat(data.summary.avg_income_amt || '0').toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">车均</div>
                </div>
              </div>
            </div>
          )}
        </div>
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
            y: data.items && data.items.length > 15 ? 600 : undefined 
          }}
          summary={() => {
            if (!data.summary) return null;
            
            return (
              <Table.Summary fixed>
                <Table.Summary.Row>
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
                      ¥{parseFloat(data.summary.income_amt || '0').toLocaleString()}
                    </div>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4}>
                    <div className="font-medium text-gray-900">
                      {parseInt(data.summary.sales_cart_count || '0').toLocaleString()}
                    </div>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5}>
                    <div className="font-medium text-gray-900">
                      ¥{parseFloat(data.summary.avg_income_amt || '0').toLocaleString()}
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