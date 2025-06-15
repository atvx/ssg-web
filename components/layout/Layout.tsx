import React, { useState, ReactNode } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { 
  HomeIcon, 
  ChartBarIcon, 
  DocumentTextIcon, 
  ClockIcon, 
  UserIcon, 
  BuildingOfficeIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import clsx from 'clsx';

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ForwardRefExoticComponent<React.SVGProps<SVGSVGElement>>;
  requiresAdmin?: boolean;
}

const navigation: NavItem[] = [
  { name: '仪表板', href: '/dashboard', icon: HomeIcon },
  { name: '销售数据', href: '/sales/data', icon: ChartBarIcon },
  { name: '目标管理', href: '/sales/targets', icon: ChartBarIcon },
  { name: '报表中心', href: '/sales/reports', icon: DocumentTextIcon },
  { name: '任务中心', href: '/tasks', icon: ClockIcon },
  { name: '个人设置', href: '/settings', icon: UserIcon },
  { name: '组织管理', href: '/organizations', icon: BuildingOfficeIcon, requiresAdmin: true },
];

const Layout: React.FC<LayoutProps> = ({ children }) => {
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

  return (
    <div className="min-h-full">
      {/* 移动端侧边栏 */}
      <div
        className={clsx(
          'fixed inset-0 z-40 flex md:hidden',
          sidebarOpen ? 'block' : 'hidden'
        )}
      >
        {/* 背景遮罩 */}
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75"
          onClick={() => setSidebarOpen(false)}
        />

        {/* 侧边栏内容 */}
        <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white pt-5 pb-4">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </button>
          </div>

          {/* Logo */}
          <div className="flex flex-shrink-0 items-center px-4">
            <span className="text-xl font-bold text-gray-900">销售助手</span>
          </div>

          {/* 导航菜单 */}
          <div className="mt-5 h-0 flex-1 overflow-y-auto">
            <nav className="space-y-1 px-2">
              {filteredNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={clsx(
                    isActive(item.href)
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                    'group flex items-center px-2 py-2 text-base font-medium rounded-md'
                  )}
                >
                  <item.icon
                    className={clsx(
                      isActive(item.href)
                        ? 'text-gray-500'
                        : 'text-gray-400 group-hover:text-gray-500',
                      'mr-4 flex-shrink-0 h-6 w-6'
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* 静态侧边栏（桌面端） */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex flex-grow flex-col overflow-y-auto border-r border-gray-200 bg-white pt-5">
          {/* Logo */}
          <div className="flex flex-shrink-0 items-center px-4">
            <span className="text-xl font-bold text-gray-900">销售助手</span>
          </div>

          {/* 导航菜单 */}
          <div className="mt-5 flex-grow flex flex-col">
            <nav className="flex-1 space-y-1 px-2 pb-4">
              {filteredNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={clsx(
                    isActive(item.href)
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
                  )}
                >
                  <item.icon
                    className={clsx(
                      isActive(item.href)
                        ? 'text-gray-500'
                        : 'text-gray-400 group-hover:text-gray-500',
                      'mr-3 flex-shrink-0 h-6 w-6'
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="md:pl-64">
        <div className="mx-auto flex flex-col flex-1">
          {/* 顶部导航栏 */}
          <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-white shadow">
            <button
              type="button"
              className="border-r border-gray-200 px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>

            <div className="flex flex-1 justify-between px-4">
              <div className="flex flex-1"></div>
              <div className="ml-4 flex items-center md:ml-6">
                {/* 用户信息 */}
                <div className="flex items-center">
                  <span className="mr-2 text-sm text-gray-700">
                    {user?.username || ''}
                  </span>
                  <button
                    onClick={logout}
                    className="inline-flex items-center text-sm text-gray-700 hover:text-gray-900"
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5 mr-1" />
                    退出
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 页面内容 */}
          <main className="flex-1">
            <div className="py-6">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout; 