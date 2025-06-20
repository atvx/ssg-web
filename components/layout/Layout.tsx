import React, { useState, ReactNode } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { 
  HomeOutlined, 
  BarChartOutlined, 
  FileTextOutlined, 
  ClockCircleOutlined, 
  UserOutlined, 
  ApartmentOutlined,
  MenuOutlined,
  CloseOutlined,
  LogoutOutlined,
  AimOutlined,
  MoneyCollectOutlined
} from '@ant-design/icons';
import { Layout as AntLayout, Menu, Button, Drawer, Dropdown, Avatar, Space, MenuProps } from 'antd';
import { useAuth } from '@/contexts/AuthContext';
import clsx from 'clsx';
import ClientOnly from '@/components/ui/ClientOnly';

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
  { name: '仪表板', href: '/', icon: <HomeOutlined /> },
  { name: '营业统计', href: '/sales/charts', icon: <BarChartOutlined /> },
  { name: '数据中心', href: '/sales/data', icon: <MoneyCollectOutlined /> },
  { name: '报表中心', href: '/sales/reports', icon: <FileTextOutlined /> },
  { name: '任务中心', href: '/tasks', icon: <ClockCircleOutlined /> },
  { name: '目标管理', href: '/sales/targets', icon: <AimOutlined /> },
  { name: '机构管理', href: '/organizations', icon: <ApartmentOutlined />, requiresAdmin: true },
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

  // 获取用户名首字母（大写）
  const getUserInitial = () => {
    if (!user?.username) return '';
    return user.username.charAt(0).toUpperCase();
  };

  // 用户下拉菜单项
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: <Link href="/settings">个人中心</Link>,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: <a onClick={logout}>退出登录</a>,
      danger: true,
    },
  ];

  return (
    <AntLayout className="min-h-screen">
      {/* 移动端侧边栏抽屉 */}
      <ClientOnly>
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
            <ClientOnly>
              <Button 
                type="text" 
                icon={<CloseOutlined />} 
                onClick={() => setSidebarOpen(false)}
                className="ml-auto"
              />
            </ClientOnly>
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
      </ClientOnly>

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
          <ClientOnly>
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setSidebarOpen(true)}
              className="ml-4 md:hidden"
            />
          </ClientOnly>

          <div className="flex items-center ml-auto mr-4">
            <ClientOnly>
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
                <Avatar 
                  style={{
                    backgroundColor: '#fde3cf',
                    color: '#f56a00',
                    verticalAlign: 'middle',
                    cursor: 'pointer'
                  }}
                  size="default"
                >
                  {getUserInitial()}
                </Avatar>
              </Dropdown>
            </ClientOnly>
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