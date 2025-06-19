import { useEffect, useLayoutEffect } from 'react';

// 在SSR环境使用useEffect，在客户端使用useLayoutEffect
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default useIsomorphicLayoutEffect; 