import React from 'react';
import { AppProps } from 'next/app';
import { AuthProvider } from '@/contexts/AuthContext';
// Ant Design 5.x不需要单独引入样式
import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}

export default MyApp; 