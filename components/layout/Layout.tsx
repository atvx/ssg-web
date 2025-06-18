import React, { useState, ReactNode } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { 
  HomeOutlined, 
  BarChartOutlined, 
  FileTextOutlined, 
  ClockCircleOutlined, 
  UserOutlined, 
  BankOutlined,
  MenuOutlined,
  CloseOutlined,
  LogoutOutlined,
  AimOutlined
} from '@ant-design/icons';
import { Layout as AntLayout, Menu, Button, Drawer } from 'antd';
import { useAuth } from '@/contexts/AuthContext';
import clsx from 'clsx';

const { Header, Sider, Content } = AntLayout;

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  requiresAdmin?: boolean;
}

const navigation: NavItem[] = [
  { name: '仪表板', href: '/dashboard', icon: <HomeOutlined /> },
  { name: '销售数据', href: '/sales/data', icon: <BarChartOutlined /> },
  { name: '目标管理', href: '/sales/targets', icon: <AimOutlined /> },
  { name: '报表中心', href: '/sales/reports', icon: <FileTextOutlined /> },
  { name: '任务中心', href: '/tasks', icon: <ClockCircleOutlined /> },
  { name: '个人设置', href: '/settings', icon: <UserOutlined /> },
  { name: '组织管理', href: '/organizations', icon: <BankOutlined />, requiresAdmin: true },
];

const AppLayout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const { user, logout } = useAuth();

  // 判断当前路由是否激活
  const isActive = (href: string) => {
    return router.pathname === href || router.pathname.startsWith(`${href}/`);
  };

  // 过滤导航项，只显示有权限的项
  const filteredNavigation = navigation.filter(
    (item) => !item.requiresAdmin || (user && user.is_superuser)
  );

  // 获取当前选中的菜单项
  const getSelectedKeys = () => {
    return filteredNavigation
      .filter(item => isActive(item.href))
      .map(item => item.href);
  };

  return (
    <AntLayout className="min-h-screen">
      {/* 移动端侧边栏抽屉 */}
      <Drawer
        placement="left"
        closable={false}
        onClose={() => setSidebarOpen(false)}
        open={sidebarOpen}
        width={250}
        styles={{ body: { padding: 0 } }}
        className="md:hidden"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-16 px-4 bg-white border-b">
            <span className="text-xl font-bold text-gray-900">销售助手</span>
            <Button 
              type="text" 
              icon={<CloseOutlined />} 
              onClick={() => setSidebarOpen(false)}
              className="ml-auto"
            />
          </div>

          {/* 导航菜单 */}
          <Menu
            mode="inline"
            selectedKeys={getSelectedKeys()}
            className="flex-1 border-0"
            items={filteredNavigation.map(item => ({
              key: item.href,
              icon: item.icon,
              label: <Link href={item.href}>{item.name}</Link>,
            }))}
          />
        </div>
      </Drawer>

      {/* 桌面端侧边栏 */}
      <Sider
        width={200}
        theme="light"
        breakpoint="md"
        className="hidden md:block shadow-sm"
        style={{
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-center border-b border-gray-200">
          <span className="text-xl font-bold text-gray-900">销售助手</span>
        </div>

        {/* 导航菜单 */}
        <Menu
          mode="inline"
          selectedKeys={getSelectedKeys()}
          style={{ height: 'calc(100% - 64px)', borderRight: 0 }}
          items={filteredNavigation.map(item => ({
            key: item.href,
            icon: item.icon,
            label: <Link href={item.href}>{item.name}</Link>,
          }))}
        />
      </Sider>

      {/* 主内容区 */}
      <AntLayout className="md:ml-[200px]">
        {/* 顶部导航栏 */}
        <Header className="bg-white p-0 shadow-sm flex items-center justify-between">
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setSidebarOpen(true)}
            className="ml-4 md:hidden"
          />

          <div className="flex items-center ml-auto mr-4">
            {/* 用户信息 */}
            <span className="mr-3 text-sm">
              {user?.username || ''}
            </span>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={logout}
              className="flex items-center text-gray-700"
            >
              退出
            </Button>
          </div>
        </Header>

        {/* 页面内容 */}
        <Content className="m-4 p-6 bg-white rounded shadow-sm">
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default AppLayout; 