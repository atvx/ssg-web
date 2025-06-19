import React from 'react';
import { format } from 'date-fns';
import { SalesData } from '@/types/api';
import { Spin } from 'antd';

interface SalesDataTableProps {
  data: SalesData | null;
  isLoading: boolean;
}

const SalesDataTable: React.FC<SalesDataTableProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="text-center py-4">
        <Spin size="small" />
      </div>
    );
  }

  if (!data || !data.details || data.details.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500">暂无销售数据</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              订单号
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              平台
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              金额
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              时间
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              状态
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.details.map((item: any, index: number) => (
            <tr key={item.order_id || index}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {item.order_id || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {item.platform || data.platform}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ¥{item.amount?.toLocaleString() || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {item.created_at ? format(new Date(item.created_at), 'yyyy-MM-dd HH:mm:ss') : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  item.status === 'completed' ? 'bg-green-100 text-green-800' : 
                  item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-gray-100 text-gray-800'
                }`}>
                  {item.status === 'completed' ? '已完成' : 
                   item.status === 'pending' ? '处理中' : 
                   item.status || '未知'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SalesDataTable; 