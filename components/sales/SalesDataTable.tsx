import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/router';
import { Table, Spin, Tag, Button, Popconfirm, message, Card, Space, Empty } from 'antd';
import { SalesRecord, SalesRecordListResponse } from '@/types/api';
import { EditOutlined, DeleteOutlined, ExclamationCircleOutlined, MoneyCollectOutlined, CarOutlined, ShopOutlined, CalendarOutlined } from '@ant-design/icons';
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
  className = '',
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
      title: '仓库/日期',
      key: 'warehouse_date',
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.warehouse_name || '-'}</div>
          <div className="text-xs text-gray-500 mt-1">{record.date || '-'}</div>
        </div>
      ),
      sorter: (a, b) => {
        // 先按仓库名排序，如果仓库名相同，再按日期排序
        if (a.warehouse_name !== b.warehouse_name) {
          return (a.warehouse_name || '').localeCompare(b.warehouse_name || '');
        }
        return new Date(a.date || '').getTime() - new Date(b.date || '').getTime();
      },
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
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <div className="flex space-x-2">
          <Button 
            type="link" 
            size="small" 
            onClick={() => router.push(`/sales/data/edit/${record.id}`)}
            icon={<EditOutlined />}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除此销售记录吗?"
            description="删除后无法恢复!"
            icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
            onConfirm={() => handleDelete(record.id)}
            okText="是"
            cancelText="否"
          >
            <Button 
              type="link" 
              danger 
              size="small" 
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  // 移动端卡片渲染
  const renderMobileCards = () => {
    if (!data?.items || data.items.length === 0) {
      return (
        <Empty
          className="my-8"
          description="暂无销售记录"
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
            <Card 
              key={record.id} 
              className="rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200"
              bodyStyle={{ padding: '16px' }}
            >
              {/* 头部信息 */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center">
                  <ShopOutlined className="text-blue-500 mr-2" />
                  <div>
                    <div className="font-medium text-gray-900">{record.warehouse_name || '-'}</div>
                    <div className="text-xs text-gray-500 flex items-center mt-1">
                      <CalendarOutlined className="mr-1" />
                      {record.date || '-'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {platformTag}
                </div>
              </div>

              {/* 数据展示 */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <MoneyCollectOutlined className="text-green-500 mr-1" />
                    <span className="text-xs text-gray-500">营业额</span>
                  </div>
                  <div className="font-semibold text-lg text-green-600">
                    ¥{record.income_amt || '0'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <CarOutlined className="text-blue-500 mr-1" />
                    <span className="text-xs text-gray-500">车次</span>
                  </div>
                  <div className="font-semibold text-lg text-blue-600">
                    {record.sales_cart_count || '0'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <MoneyCollectOutlined className="text-orange-500 mr-1" />
                    <span className="text-xs text-gray-500">车均</span>
                  </div>
                  <div className="font-semibold text-lg text-orange-600">
                    ¥{record.avg_income_amt || '0'}
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex justify-end border-t border-gray-100 pt-3">
                <Space>
                  <Button 
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => router.push(`/sales/data/edit/${record.id}`)}
                    className="text-blue-500 hover:bg-blue-50"
                  >
                    编辑
                  </Button>
                  <Popconfirm
                    title="确定要删除此销售记录吗?"
                    description="删除后无法恢复!"
                    icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
                    onConfirm={() => handleDelete(record.id)}
                    okText="是"
                    cancelText="否"
                  >
                    <Button 
                      type="text" 
                      danger 
                      icon={<DeleteOutlined />}
                      className="hover:bg-red-50"
                    >
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={`text-center py-10 ${className}`}>
        <Spin size="large" tip="载入中..." />
      </div>
    );
  }

  if (!data || !data.items || data.items.length === 0) {
    return (
      <div className={`text-center py-10 ${className}`}>
        <Empty
          description="暂无销售记录"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
        <Button 
          type="primary" 
          onClick={() => router.push('/sales/data/new')}
          className="mt-4 rounded-lg"
        >
          添加销售记录
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      {isMobile ? (
        // 移动端卡片布局
        <div className="p-3">
          {renderMobileCards()}
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
        />
      )}
    </div>
  );
};

export default SalesDataTable; 