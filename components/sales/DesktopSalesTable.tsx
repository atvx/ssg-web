import React from 'react';
import { Table, Empty, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { format } from 'date-fns';
import { SalesRecord, SalesRecordListResponse } from '@/types/api';

interface DesktopSalesTableProps {
  data?: SalesRecordListResponse | null;
  isLoading?: boolean;
  className?: string;
  onChange?: (pagination: any, filters: any, sorter: any) => void;
}

const DesktopSalesTable: React.FC<DesktopSalesTableProps> = ({
  data,
  isLoading = false,
  className = '',
  onChange
}) => {
  const columns: ColumnsType<SalesRecord> = [
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
      responsive: ['lg'],
    },
  ];

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
      <Table 
        columns={columns}
        dataSource={data.items}
        rowKey={record => `${record.id || ''}-${record.date}-${record.warehouse_name}`}
        pagination={false}
        loading={isLoading}
        onChange={onChange}
        className="shadow rounded-md"
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
    </div>
  );
};

export default DesktopSalesTable; 