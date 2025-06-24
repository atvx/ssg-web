# Docker部署指南

本文档详细介绍了如何使用Docker和Docker Compose部署销售助手应用。

## 目录结构

部署相关文件:

```
├── Dockerfile            # 应用容器构建配置
├── docker-compose.yml    # Docker Compose服务定义
├── docker.env.example    # 环境变量示例文件
├── docker-deploy.sh      # 部署脚本
└── .dockerignore         # Docker构建忽略文件
```

## 前置条件

1. 已安装Docker (20.10+)
2. 已安装Docker Compose (2.0+)
3. 可选: Git

## 快速部署

### 基本部署流程

1. 准备环境

```bash
# 复制环境变量文件
cp docker.env.example docker.env.dev

# 修改环境变量
vim docker.env.dev  # 或使用任何文本编辑器
```

2. 使用部署脚本

```bash
# 给脚本执行权限
chmod +x docker-deploy.sh

# 开发环境部署
./docker-deploy.sh -e dev -b

# 测试环境部署
./docker-deploy.sh -e test -b

# 生产环境部署
./docker-deploy.sh -e prod -b
```

脚本选项:
- `-e, --env ENV` - 指定环境 (dev, test, prod) [默认: dev]
- `-b, --build` - 重新构建镜像
- `-c, --clean` - 部署前清理
- `-h, --help` - 显示帮助信息

### 手动部署流程

1. 创建并配置环境变量文件:

```bash
cp docker.env.example docker.env.prod
```

2. 修改环境变量:

```
API_URL=http://api.yourdomain.com
PORT=3109
# 其他环境变量...
```

3. 创建必要的目录:

```bash
mkdir -p public/uploads
```

4. 构建和启动容器:

```bash
docker compose --env-file docker.env.prod build
docker compose --env-file docker.env.prod up -d
```

## 环境变量配置

关键环境变量:

- `API_URL`: 后端API的URL地址
- `PORT`: 应用端口 (默认: 3109)
- `NODE_ENV`: Node.js环境 (production, development)
- `NEXT_PUBLIC_JWT_EXPIRY`: JWT过期时间(秒)
- `NEXT_PUBLIC_AUTH_STORAGE`: 认证存储方式 (cookie, localStorage)
- `NEXT_PUBLIC_FEATURE_REPORTS`: 是否启用报表功能
- `NEXT_PUBLIC_FEATURE_TASKS`: 是否启用任务功能

## 服务组件

**frontend**: Next.js应用
   - 构建自本项目的Dockerfile
   - 运行在3109端口
   - 提供销售助手应用的核心功能
   - 挂载上传文件目录以便持久化存储

## 扩展和定制

### 添加SSL证书

若需要HTTPS，可以考虑以下方案：

1. 使用反向代理服务器（如AWS ALB、Nginx或Caddy）
2. 使用Traefik作为边缘路由器

### 扩展Docker Compose配置

根据需要可以添加其他服务，例如:

- 添加API服务容器
- 添加数据库服务
- 添加文件存储服务

## 容器管理

常用命令:

```bash
# 查看运行的容器
docker compose ps

# 查看服务日志
docker compose logs

# 查看特定服务的日志
docker compose logs frontend

# 重启所有服务
docker compose restart

# 重启特定服务
docker compose restart frontend

# 停止所有服务
docker compose down
```

## 日志管理

应用日志通过Docker日志驱动收集，可以通过以下命令查看：

```bash
# 查看实时日志
docker logs -f sales-assistant-frontend

# 查看最近100行日志
docker logs --tail 100 sales-assistant-frontend

# 查看特定时间范围的日志
docker logs --since 2023-01-01T00:00:00 sales-assistant-frontend
```

## 故障排除

常见问题和解决方法:

1. **容器无法启动**
   - 检查环境变量配置
   - 检查端口冲突
   - 查看容器日志: `docker compose logs frontend`

2. **无法连接到应用**
   - 确认端口映射正确
   - 检查防火墙规则
   - 验证应用是否在容器内正常运行

3. **健康检查失败**
   - 确认应用已完全启动
   - 检查`/api/health`端点是否可访问
   - 查看应用日志是否有错误

4. **上传文件问题**
   - 确认volumes挂载配置正确
   - 检查目录权限 