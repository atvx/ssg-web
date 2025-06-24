# 销售助手应用部署方案

本文档详细说明了销售助手应用的部署方案、环境配置及最佳实践。

## 目录

- [部署环境](#部署环境)
- [服务器配置](#服务器配置)
- [部署方式](#部署方式)
- [CI/CD流程](#cicd流程)
- [环境变量配置](#环境变量配置)
- [数据库配置](#数据库配置)
- [监控与日志](#监控与日志)
- [性能优化](#性能优化)
- [安全措施](#安全措施)
- [备份策略](#备份策略)
- [故障恢复](#故障恢复)

## 部署环境

销售助手应用支持以下部署环境：

### 开发环境
- 用途：日常开发和功能测试
- 建议配置：轻量级服务器或本地开发
- 自动化程度：本地构建，手动部署
- 分支：`develop`

### 测试环境
- 用途：集成测试和用户验收测试
- 建议配置：与生产环境类似，但规模较小
- 自动化程度：自动构建，手动/自动部署
- 分支：`test` 或 `staging`

### 生产环境
- 用途：面向最终用户的稳定版本
- 建议配置：高可用性、负载均衡的服务器集群
- 自动化程度：完全自动化的构建和部署
- 分支：`main` 或 `production`

## 服务器配置

### 最低配置要求
- **CPU**: 2核
- **内存**: 4GB RAM
- **存储**: 50GB SSD
- **操作系统**: Ubuntu 20.04 LTS 或 CentOS 8+
- **网络**: 100Mbps带宽

### 推荐配置（生产环境）
- **CPU**: 4核或以上
- **内存**: 8GB RAM或以上
- **存储**: 100GB SSD
- **操作系统**: Ubuntu 22.04 LTS
- **网络**: 1Gbps带宽，配置CDN

### 软件要求
- Node.js: v16.x 或更高版本
- Nginx: 最新稳定版
- PM2: 最新版（用于进程管理）
- Docker (可选): 最新稳定版

## 部署方式

销售助手应用支持多种部署方式，可根据实际需求选择：

### 1. 传统部署

基于Node.js服务器直接部署Next.js应用：

```bash
# 安装依赖
npm install --production

# 构建应用
npm run build

# 启动应用（使用PM2）
pm2 start npm --name "sales-assistant" -- start
```

### 2. Docker容器部署

使用Docker容器化部署（推荐）：

```dockerfile
FROM node:16-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

FROM node:16-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
```

运行容器：

```bash
docker build -t sales-assistant .
docker run -p 3000:3000 -e NEXT_PUBLIC_API_URL=http://api.example.com sales-assistant
```

### 3. 静态导出部署

对于不需要服务端功能的情况，可以使用静态导出：

```bash
# 在next.config.js中配置
# module.exports = { output: 'export' }

# 构建静态文件
npm run build

# 静态文件位于out目录，可部署到任何静态文件服务器
```

## CI/CD流程

推荐使用以下CI/CD流程自动化部署：

### GitHub Actions工作流

```yaml
name: Deploy Sales Assistant

on:
  push:
    branches: [ main, staging ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '16'
        
    - name: Install Dependencies
      run: npm install
      
    - name: Run Tests
      run: npm test
      
    - name: Build
      run: npm run build
      
    - name: Deploy to Production
      if: github.ref == 'refs/heads/main'
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.PROD_HOST }}
        username: ${{ secrets.PROD_USER }}
        key: ${{ secrets.PROD_SSH_KEY }}
        script: |
          cd /path/to/app
          git pull
          npm install
          npm run build
          pm2 restart sales-assistant
          
    - name: Deploy to Staging
      if: github.ref == 'refs/heads/staging'
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.STAGING_HOST }}
        username: ${{ secrets.STAGING_USER }}
        key: ${{ secrets.STAGING_SSH_KEY }}
        script: |
          cd /path/to/app
          git pull
          npm install
          npm run build
          pm2 restart sales-assistant-staging
```

## 环境变量配置

应用需要配置以下环境变量：

### 核心变量

```
# API 配置
NEXT_PUBLIC_API_URL=https://api.example.com

# 认证配置
NEXT_PUBLIC_JWT_EXPIRY=86400
NEXT_PUBLIC_AUTH_STORAGE=cookie

# 功能开关
NEXT_PUBLIC_FEATURE_REPORTS=true
NEXT_PUBLIC_FEATURE_TASKS=true

# 日志级别
LOG_LEVEL=info
```

### 环境变量管理

1. **开发环境**：使用`.env.local`文件
2. **测试环境**：使用CI/CD系统的环境变量配置
3. **生产环境**：使用服务器环境变量或密钥管理系统

## 数据库配置

销售助手前端应用通过API与后端通信，无需直接配置数据库。确保API服务已正确配置并可访问。

## 监控与日志

### 应用监控

推荐使用以下工具进行应用监控：

1. **PM2**：进程监控和基本的性能指标
   ```bash
   pm2 monitor
   ```

2. **Sentry**：错误跟踪和性能监控
   ```javascript
   // 在_app.tsx中配置
   Sentry.init({
     dsn: "https://your-sentry-dsn.ingest.sentry.io/project",
   });
   ```

3. **New Relic/Datadog**：全面的应用性能监控（APM）

### 日志管理

1. **应用日志**：使用`winston`或`pino`记录关键操作
2. **访问日志**：通过Nginx配置
3. **集中式日志**：使用ELK栈（Elasticsearch, Logstash, Kibana）

## 性能优化

### 前端优化

1. **代码分割**：确保已启用Next.js的自动代码分割
2. **图片优化**：使用Next.js的`Image`组件优化图片
3. **静态资源缓存**：配置适当的缓存策略

```nginx
# Nginx缓存配置
location /_next/static/ {
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

### 服务器优化

1. **启用Gzip压缩**
   ```nginx
   gzip on;
   gzip_types text/plain text/css application/json application/javascript;
   ```

2. **配置CDN**：推荐使用Cloudflare、Akamai或阿里云CDN

3. **多实例部署**：使用PM2集群模式
   ```bash
   pm2 start npm --name "sales-assistant" -i max -- start
   ```

## 安全措施

### 前端安全配置

1. **配置安全标头**：
   ```nginx
   add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;";
   add_header X-Frame-Options "SAMEORIGIN";
   add_header X-Content-Type-Options "nosniff";
   add_header Referrer-Policy "strict-origin-when-cross-origin";
   ```

2. **HTTPS配置**：使用Let's Encrypt免费证书
   ```bash
   certbot --nginx -d example.com -d www.example.com
   ```

3. **防止XSS攻击**：使用`next-secure-headers`包

### API安全

1. **CORS配置**：仅允许受信任的来源
2. **速率限制**：使用Nginx或API网关实现
3. **JWT安全存储**：使用HttpOnly cookie存储

## 备份策略

1. **代码备份**：使用Git存储库作为主要备份
2. **环境配置备份**：定期备份环境变量和配置文件
3. **静态资源备份**：定期备份上传的图片和文档

## 故障恢复

1. **故障检测**：配置健康检查端点
   ```javascript
   // pages/api/health.js
   export default function handler(req, res) {
     res.status(200).json({ status: 'ok' });
   }
   ```

2. **自动重启**：配置PM2的自动重启
   ```bash
   pm2 startup
   pm2 save
   ```

3. **回滚机制**：保留最近几个版本，配置快速回滚脚本
   ```bash
   # rollback.sh
   git checkout v1.2.3
   npm install
   npm run build
   pm2 restart sales-assistant
   ```

## 部署检查清单

每次部署前检查以下项目：

- [ ] 所有测试都已通过
- [ ] 环境变量已正确配置
- [ ] 构建脚本正常工作
- [ ] API端点已配置并可访问
- [ ] 数据库迁移脚本已准备（如果需要）
- [ ] 性能和安全检查已完成
- [ ] 回滚计划已制定 