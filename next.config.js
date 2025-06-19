/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compiler: {
    // 启用样式优化
    styledComponents: true,
    // 删除开发中的console语句
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    // 优化字体加载
    optimizeFonts: true,
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
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            commons: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
          },
        },
      };
    }
    return config;
  },
}

module.exports = nextConfig 