/**
 * API健康检查端点
 * 用于Docker容器健康检查和负载均衡器健康探测
 */
export default function handler(req, res) {
  // 返回健康状态
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || 'unknown'
  });
} 