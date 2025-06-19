import React from 'react';
import { AppProps } from 'next/app';
import { AuthProvider } from '@/contexts/AuthContext';
import dynamic from 'next/dynamic';
import '../styles/globals.css';

// 优化AppProps类型
type NextAppProps = AppProps & {
  Component: AppProps['Component'] & {
    getLayout?: (page: React.ReactElement) => React.ReactNode;
  };
};

function MyApp({ Component, pageProps }: NextAppProps) {
  // 使用组件提供的布局或默认布局
  const getLayout = Component.getLayout ?? ((page) => page);

  return (
    <AuthProvider>
      {getLayout(<Component {...pageProps} />)}
    </AuthProvider>
  );
}

export default MyApp; 