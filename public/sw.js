// 最简单的 Service Worker for 移动端PWA
const CACHE_NAME = 'ssg-sales-v1';

// 安装事件
self.addEventListener('install', (event) => {
  console.log('PWA Service Worker 安装');
  self.skipWaiting();
});

// 激活事件  
self.addEventListener('activate', (event) => {
  console.log('PWA Service Worker 激活');
  self.clients.claim();
});

// 网络请求 - 简单的网络优先策略
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      // 网络失败时的基本处理
      return new Response('离线模式', { 
        status: 200, 
        headers: { 'Content-Type': 'text/plain' } 
      });
    })
  );
}); 