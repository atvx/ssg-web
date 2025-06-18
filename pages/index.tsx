import AppLayout from '@/components/layout/Layout';
import PageHeader from '@/components/ui/PageHeader';

export default function Home() {
  return (
    <AppLayout>
      <PageHeader 
        title="欢迎使用销售助手" 
        description="这是一个基于Ant Design和Tailwind CSS构建的销售管理系统" 
      />
      <div className="mt-8">
        <p className="text-lg">请从左侧菜单选择功能模块</p>
      </div>
    </AppLayout>
  );
} 