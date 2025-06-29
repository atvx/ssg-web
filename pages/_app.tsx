import React from 'react';
import Head from 'next/head';
import { AppProps } from 'next/app';
import { AuthProvider } from '@/contexts/AuthContext';
import { VerificationProvider } from '@/contexts/VerificationContext';
import VerificationModal from '@/components/ui/VerificationModal';
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
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#0ea5e9" />
      </Head>
      <AuthProvider>
        <VerificationProvider>
          {getLayout(<Component {...pageProps} />)}
          <VerificationModal />
        </VerificationProvider>
      </AuthProvider>
    </>
  );
}

export default MyApp; 