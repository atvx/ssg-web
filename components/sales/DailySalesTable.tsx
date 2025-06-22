import React from 'react';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

interface MarketData {
  key: string;
  area: string;
  rank: number | null;
  name: string | null;
  vehicleConfig: number;
  dailySales: number;
  dailyAverage: number;
  dailyTrips: number;
  monthTarget: number;
  monthTotal: number;
  completionRate: string;
  totalAverage: number;
  totalTrips: number;
  isSubtotal?: boolean;
  isTotal?: boolean;
}

interface DailySalesTableProps {
  data: MarketData[];
  loading?: boolean;
  className?: string;
  date?: dayjs.Dayjs;
}

const DailySalesTable: React.FC<DailySalesTableProps> = ({ 
  data, 
  loading = false, 
  className = '',
  date = dayjs()
}) => {
  // 获取市场分组信息，用于设置边框样式
  const getMarketGroups = () => {
    const marketGroups: { [key: string]: number[] } = {};
    let currentIndex = 0;
    let lastArea = '';
    
    data.forEach((item, index) => {
      if (item.isTotal) {
        // 记录总计行的索引
        marketGroups['total'] = [index];
      } else if (item.area !== lastArea && !item.isSubtotal) {
        // 新的市场区域开始
        lastArea = item.area;
        currentIndex = index;
        marketGroups[item.area] = [currentIndex];
      } else if (item.isSubtotal) {
        // 市场区域结束（小计行）
        if (marketGroups[lastArea]) {
          marketGroups[lastArea].push(index);
        }
      }
    });
    
    return marketGroups;
  };

  // 自定义行类名
  const customRowClassName = (record: MarketData, index: number) => {
    const marketGroups = getMarketGroups();
    
    // 检查是否是总计行
    if (record.isTotal) {
      return 'total-row';
    }
    
    // 检查是否是小计行
    if (record.isSubtotal) {
      return 'subtotal-row';
    }
    
    // 检查是否是市场区域的第一行（包括第一个市场）
    for (const area in marketGroups) {
      if (area !== 'total') {
        if (marketGroups[area][0] === index) {
          return 'market-boundary-row';
        }
      }
    }
    
    return '';
  };

  const columns: ColumnsType<MarketData> = [
    {
      title: '区域',
      dataIndex: 'area',
      key: 'area',
      width: 100,
      align: 'center',
      render: (text) => text,
      onCell: (record, index) => {
        // 确定此区域的第一行
        if (index === undefined) return {};
        
        const sameAreaPrevRows = data.slice(0, index).filter(item => 
          item.area === record.area && !item.isTotal
        );
        
        if (record.isTotal) {
          // 如果是总计行，合并三列（区域、序号和名称）
          return {
            colSpan: 3,
            style: { 
              fontWeight: 'bold',
              textAlign: 'center'
            }
          };
        } else if (sameAreaPrevRows.length === 0) {
          // 找出同一区域的所有行数量（不包括小计）
          const sameAreaRows = data.filter(item => 
            item.area === record.area && !item.isTotal && !item.isSubtotal
          );
          const sameAreaSubtotalRows = data.filter(item =>
            item.area === record.area && item.isSubtotal
          );
          
          // 合并区域单元格，包括子行和小计行
          return {
            rowSpan: sameAreaRows.length + sameAreaSubtotalRows.length,
            style: { 
              verticalAlign: 'middle',
              fontWeight: 'bold'
            }
          };
        } else {
          return {
            rowSpan: 0
          };
        }
      }
    },
    {
      title: '序号',
      dataIndex: 'rank',
      key: 'rank',
      width: 60,
      align: 'center',
      render: (value, record) => {
        // 如果是小计行，显示"小计"
        if (record.isSubtotal) {
          return '小计';
        }
        return value;
      },
      onCell: (record) => {
        // 如果是总计行，不显示内容
        if (record.isTotal) {
          return {
            colSpan: 0
          };
        }
        
        // 如果是小计行，合并序号和名称列
        if (record.isSubtotal) {
          return {
            colSpan: 2,
            style: { 
              fontWeight: 'bold',
              textAlign: 'center' 
            }
          };
        }
        
        return {};
      }
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      align: 'left',
      render: (text) => text,
      onCell: (record) => {
        // 如果是总计行，不显示内容
        if (record.isTotal) {
          return {
            colSpan: 0
          };
        }
        
        // 如果是小计行，不显示内容（由序号列负责显示"小计"）
        if (record.isSubtotal) {
          return {
            colSpan: 0
          };
        }
        
        return {};
      }
    },
    {
      title: '车辆配置',
      dataIndex: 'vehicleConfig',
      key: 'vehicleConfig',
      width: 100,
      align: 'center',
      render: (value) => value,
      onCell: (record) => {
        if (record.isTotal || record.isSubtotal) {
          return {
            style: { fontWeight: 'bold' }
          };
        }
        return {};
      }
    },
    {
      title: '当日销售',
      dataIndex: 'dailySales',
      key: 'dailySales',
      align: 'center',
      render: (value) => value.toLocaleString(),
      onCell: (record) => {
        if (record.isTotal || record.isSubtotal) {
          return {
            style: { fontWeight: 'bold' }
          };
        }
        return {};
      }
    },
    {
      title: '当日车均',
      dataIndex: 'dailyAverage',
      key: 'dailyAverage',
      align: 'center',
      render: (value) => value.toLocaleString(),
      onCell: (record) => {
        if (record.isTotal || record.isSubtotal) {
          return {
            style: { fontWeight: 'bold' }
          };
        }
        return {};
      }
    },
    {
      title: '当日车次',
      dataIndex: 'dailyTrips',
      key: 'dailyTrips',
      align: 'center',
      render: (value) => value,
      onCell: (record) => {
        if (record.isTotal || record.isSubtotal) {
          return {
            style: { fontWeight: 'bold' }
          };
        }
        return {};
      }
    },
    {
      title: '月目标',
      dataIndex: 'monthTarget',
      key: 'monthTarget',
      align: 'center',
      render: (value) => value.toLocaleString(),
      onCell: (record) => {
        if (record.isTotal || record.isSubtotal) {
          return {
            style: { fontWeight: 'bold' }
          };
        }
        return {};
      }
    },
    {
      title: '月累计',
      dataIndex: 'monthTotal',
      key: 'monthTotal',
      align: 'center',
      render: (value) => value.toLocaleString(),
      onCell: (record) => {
        if (record.isTotal || record.isSubtotal) {
          return {
            style: { fontWeight: 'bold' }
          };
        }
        return {};
      }
    },
    {
      title: '累计达成率',
      dataIndex: 'completionRate',
      key: 'completionRate',
      align: 'center',
      render: (value) => `${value}%`,
      onCell: (record) => {
        if (record.isTotal || record.isSubtotal) {
          return {
            style: { fontWeight: 'bold' }
          };
        }
        return {};
      }
    },
    {
      title: '累计车均',
      dataIndex: 'totalAverage',
      key: 'totalAverage',
      align: 'center',
      render: (value) => value,
      onCell: (record) => {
        if (record.isTotal || record.isSubtotal) {
          return {
            style: { fontWeight: 'bold' }
          };
        }
        return {};
      }
    },
    {
      title: '累计车次',
      dataIndex: 'totalTrips',
      key: 'totalTrips',
      align: 'center',
      render: (value) => value,
      onCell: (record) => {
        if (record.isTotal || record.isSubtotal) {
          return {
            style: { fontWeight: 'bold' }
          };
        }
        return {};
      }
    },
  ];

  return (
    <div className={className}>
      {/* 添加表格标题栏 */}
      <div 
        style={{ 
          backgroundColor: '#343a40', 
          color: 'white', 
          textAlign: 'center', 
          padding: '10px 0', 
          fontSize: '18px',
          fontWeight: 'bold',
          marginBottom: '-1px', // 确保与表格无缝连接
          border: '1px solid #000', // 添加黑色边框
          fontFamily: '"Microsoft YaHei", Arial, sans-serif' // 添加字体设置
        }}
      >
        市场销售日报 {date.format('M月D日')}
      </div>
      <Table 
        columns={columns} 
        dataSource={data} 
        pagination={false} 
        loading={loading}
        bordered
        size="middle"
        rowClassName={customRowClassName}
        className="custom-table"
      />
      <style jsx global>{`
        .custom-table {
          font-family: "Microsoft YaHei", Arial, sans-serif;
        }
        
        .custom-table .ant-table-thead > tr > th {
          background-color: white;
          font-weight: bold;
          font-family: "Microsoft YaHei", Arial, sans-serif;
          height: 30px;
          line-height: 30px;
          padding: 4px 8px;
          vertical-align: middle;
        }
  
        .custom-table .ant-table-tbody > tr > td {
          font-family: "Microsoft YaHei", Arial, sans-serif;
          height: 30px;
          line-height: 30px;
          padding: 4px 8px;
          vertical-align: middle;
        }

        .custom-table .ant-table-thead > tr > th:nth-child(3) {
          text-align: center!important;
        }
        
        /* 移除表格圆角 */
        .custom-table .ant-table-container {
          border-radius: 0 !important;
        }
        
        .custom-table .ant-table-content,
        .custom-table table,
        .custom-table .ant-table-thead > tr > th,
        .custom-table .ant-table-tbody > tr > td,
        .custom-table .ant-table-thead > tr:first-child > th:first-child,
        .custom-table .ant-table-thead > tr:first-child > th:last-child,
        .custom-table .ant-table-tbody > tr:last-child > td:first-child,
        .custom-table .ant-table-tbody > tr:last-child > td:last-child {
          border-radius: 0 !important;
        }
        
        /* 设置表格边框颜色 */
        .custom-table .ant-table-thead > tr > th,
        .custom-table .ant-table-tbody > tr > td,
        .custom-table .ant-table-cell,
        .custom-table .ant-table-container,
        .custom-table .ant-table-cell::before,
        .custom-table .ant-table {
          border-color: #000 !important; /* 修改为黑色边框 */
        }
        
        /* 表格外边框 */
        .custom-table .ant-table {
          border: 1px solid #000 !important;
        }
        
        /* 表头区外边框 */
        .custom-table .ant-table-thead > tr > th:first-child,
        .custom-table .ant-table-thead > tr > th:last-child {
          border-left: 1px solid #000 !important;
          border-right: 2px solid #000 !important;
        }
        
        /* 市场之间的边界行 */
        .custom-table .market-boundary-row > td {
            border-top: 2px solid #000 !important;
        }

        .custom-table .market-boundary-row > td:first-child {
          border-left: 1px solid #000 !important;
          border-right: 3px solid #000 !important;
        }

        .custom-table .market-boundary-row > td:last-child {
          border-right: 2px solid #000 !important;
        }

        .ant-table-tbody > tr > td:last-child {
          border-right: 2px solid #000 !important;
        }
        
        /* 总计行样式 */
        .custom-table .total-row > td {
          border-top: 2px solid #000 !important;
          border-bottom: 2px solid #000 !important;
        }

        .custom-table .total-row > td:first-child {
          border-left: 1px solid #000 !important;
        }

        .custom-table .total-row > td:last-child {
          border-right: 2px solid #000 !important;
        }
        
        /* 为了确保表格边框完整显示 */
        .custom-table .ant-table-container {
          border-top: none;
        }
        
        .custom-table .ant-table-container::before {
          display: none;
        }

        .custom-table img {
          display: inline-block !important;
        }
        
        /* 确保行高和垂直居中在所有场景下都生效 */
        .custom-table .ant-table-tbody > tr,
        .custom-table .ant-table-thead > tr {
          height: 30px !important;
        }
        
        .custom-table .ant-table-tbody > tr > td,
        .custom-table .ant-table-thead > tr > th {
          height: 30px !important;
          line-height: 30px !important;
          vertical-align: middle !important;
        }
      `}</style>
    </div>
  );
};

export default DailySalesTable; 