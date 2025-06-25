/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: false, // 禁用SWC压缩
  // 优化字体加载
  optimizeFonts: true,
  compiler: {
    // 禁用SWC编译器相关功能
    styledComponents: false,
    // 删除开发中的console语句
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    // 禁用实验性功能以减少内存占用
  },
  // 图片优化配置
  images: {
    domains: ['localhost'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
  // 优化打包
  webpack: (config, { dev, isServer }) => {
    // 只在生产环境开启这些优化
    if (!dev) {
      // 分块优化
      config.optimization = {
        ...config.optimization,
        // 减少内存使用的分块配置
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            commons: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
              enforce: true,
            },
          },
          maxInitialRequests: 3, // 限制初始化加载的请求数
          maxAsyncRequests: 5, // 限制异步加载的请求数
          minSize: 20000, // 增加最小块大小以减少生成的块数量
        },
        // 减少内存使用
        minimize: true,
        minimizer: config.optimization.minimizer,
      };
    }

    // 禁用源码映射以加速构建
    if (!dev) {
      config.devtool = false;
    }

    return config;
  },
}

module.exports = nextConfig 