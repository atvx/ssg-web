import React from 'react';
import { Empty, Tag } from 'antd';
import { useInView } from 'react-intersection-observer';
import { SalesRecord, SalesRecordListResponse } from '@/types/api';

interface MobileSalesTableProps {
  data?: SalesRecordListResponse | null;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  className?: string;
  onLoadMore?: () => void;
}

const MobileSalesTable: React.FC<MobileSalesTableProps> = ({
  data,
  isLoading = false,
  isLoadingMore = false,
  hasMore = false,
  className = '',
  onLoadMore
}) => {
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: '100px 0px'
  });

  // 触发加载更多
  React.useEffect(() => {
    if (inView && hasMore && !isLoadingMore && !isLoading && onLoadMore) {
      onLoadMore();
    }
  }, [inView, hasMore, isLoadingMore, isLoading, onLoadMore]);

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
    <div className={className}>
      {/* 合计卡片 */}
      {data.summary && (
        <div className="sticky top-6 z-10 transition-shadow duration-200 summary-card">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg backdrop-blur-sm">
            <div className="text-lg font-medium mb-3 flex items-center">
              <span className="text-xl">合计</span>
              <div className="ml-auto text-sm opacity-80">共 {data.total || 0} 条</div>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div className="flex flex-col items-start">
                <div className="text-[18px] leading-[1.2] font-semibold tracking-tight whitespace-nowrap">
                  ¥{Number(data.summary.income_amt || 0).toLocaleString('zh-CN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </div>
                <div className="text-xs opacity-70">营业额</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-[18px] leading-[1.2] font-semibold tracking-tight whitespace-nowrap">
                  {Number(data.summary.sales_cart_count || 0).toLocaleString('zh-CN', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  })}
                </div>
                <div className="text-xs opacity-70">车次</div>
              </div>
              <div className="flex flex-col items-end">
                <div className="text-[18px] leading-[1.2] font-semibold tracking-tight whitespace-nowrap">
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
        {data.items.map((record: SalesRecord) => (
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
        ref={loadMoreRef}
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

export default MobileSalesTable; 