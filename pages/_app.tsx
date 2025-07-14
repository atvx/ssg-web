import React, { useEffect } from 'react';
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

  // 注册Service Worker（仅在浏览器端）
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW 注册成功:', registration);
        })
        .catch((error) => {
          console.log('SW 注册失败:', error);
        });
    }
  }, []);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="format-detection" content="telephone=no" />
        
        {/* 页面标题 */}
        <title>兰宝宝</title>
        
        {/* PWA Meta Tags */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SSG销售助手" />
        <meta name="application-name" content="SSG销售助手" />
        <meta name="theme-color" content="#1f2937" />
        <meta name="msapplication-TileColor" content="#1f2937" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* SEO Meta Tags */}
        <meta name="description" content="专业的销售数据管理和分析工具 - 您的智能销售伙伴" />
        <meta name="keywords" content="销售助手,数据分析,销售管理,PWA应用,SSG" />
        <meta name="author" content="SSG Sales Team" />
        
        {/* 图标配置 - 移动端优化 */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/ssg.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/ssg.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/ssg.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/ssg.png" />
        
        {/* Android Chrome */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-status-bar-style" content="black" />
        
        {/* Microsoft Tiles */}
        <meta name="msapplication-TileImage" content="/icons/ssg.png" />
        <meta name="msapplication-TileColor" content="#1f2937" />
        
        {/* 禁用iOS输入框放大 */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
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