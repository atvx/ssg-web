import { useEffect } from 'react';

/**
 * 在移动端启用下拉刷新。
 * 当页面滚动到顶部并向下拉超过阈值时，执行 callback。
 * 桌面端或非移动浏览器默认不启用。
 */
export const usePullToRefresh = (
  callback: () => void,
  isEnabled: boolean = true,
  threshold: number = 70
) => {
  useEffect(() => {
    if (!isEnabled) return;

    let startY = 0;

    const onTouchStart = (e: TouchEvent) => {
      // 仅当顶部位置才开始记录
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
      } else {
        startY = 0;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!startY) return;
      const endY = e.changedTouches[0].clientY;
      if (endY - startY > threshold) {
        callback();
      }
      startY = 0;
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [callback, isEnabled, threshold]);
}; 