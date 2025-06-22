import React, { useState } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/router';
import { Table, Spin, Tag, Button, Popconfirm, message } from 'antd';
import { SalesRecord, SalesRecordListResponse } from '@/types/api';
import { EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { salesAPI } from '@/lib/api';

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

  const columns: ColumnsType<SalesRecord> = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      render: (text) => text || '-',
      sorter: (a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return -1;
        if (!b.date) return 1;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      },
      sortDirections: ['ascend', 'descend'],
    },
    {
      title: '仓库',
      dataIndex: 'warehouse_name',
      key: 'warehouse_name',
      render: (text) => <span style={{ fontWeight: 'bold' }}>{text || '-'}</span>,
      sorter: (a, b) => {
        if (!a.warehouse_name && !b.warehouse_name) return 0;
        if (!a.warehouse_name) return -1;
        if (!b.warehouse_name) return 1;
        return a.warehouse_name.localeCompare(b.warehouse_name);
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

  if (isLoading) {
    return (
      <div className={`text-center py-10 ${className}`}>
        <Spin size="large" />
      </div>
    );
  }

  if (!data || !data.items || data.items.length === 0) {
    return (
      <div className={`text-center py-10 ${className}`}>
        <p className="text-gray-500 mb-4">暂无销售记录</p>
        <Button type="primary" onClick={() => router.push('/sales/data/new')}>
          添加销售记录
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      <Table 
        columns={columns}
        dataSource={data.items}
        rowKey="id"
        pagination={false}
        className="shadow rounded-md"
        onChange={onChange}
      />
    </div>
  );
};

export default SalesDataTable; 