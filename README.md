# 销售助手应用

一个自适应PC和移动端的销售数据管理系统，帮助销售人员实时查看数据、管理目标和导出报表。

## 主要功能

- **用户管理**: 注册、登录、个人信息修改、密码管理
- **销售数据**: 多平台销售数据同步与展示
- **目标管理**: 月度销售目标设置与跟踪
- **报表功能**: 日报导出（Excel、PDF、图片）
- **任务系统**: 异步任务管理与状态监控
- **组织管理**: 多级机构管理与数据权限控制

## 技术栈

- **前端框架**: React.js、Next.js 13+、TypeScript 4.9+
- **UI组件**: TailwindCSS 3.x
- **状态管理**: React Context API + SWR
- **网络请求**: Axios
- **身份验证**: JWT认证
- **响应式设计**: 使用Tailwind的响应式工具，自适应PC和移动端

## 开发环境要求

- Node.js 16.x 或更高版本
- npm 8.x 或更高版本
- Git

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发环境运行

```bash
npm run dev
```

### 构建生产环境

```bash
npm run build
```

### 运行生产环境

```bash
npm start
```

## 项目结构

```
├── components/          # React组件
│   ├── auth/            # 认证相关组件
│   ├── dashboard/       # 仪表板组件
│   ├── layout/          # 布局组件
│   ├── sales/           # 销售数据相关组件
│   └── ui/              # 通用UI组件
├── contexts/            # React上下文
├── hooks/               # 自定义Hooks
├── lib/                 # 工具函数和API客户端
├── pages/               # Next.js页面
├── public/              # 静态资源
├── styles/              # 全局样式
├── types/               # TypeScript类型定义
└── utils/               # 辅助函数
```

## 主要页面

- **登录/注册**: 用户认证
- **仪表板**: 销售数据概览
- **销售数据**: 详细销售数据展示与筛选
- **目标管理**: 销售目标设置与进度跟踪
- **报表中心**: 报表生成与导出
- **任务中心**: 异步任务监控
- **个人设置**: 用户信息与密码管理
- **组织管理**: 机构管理（管理员）

## API文档

API详细文档见[API文档](./API.md)

## 浏览器支持

- Chrome (最新版)
- Firefox (最新版)
- Safari (最新版)
- Edge (最新版)
- 移动浏览器

## 授权协议

[MIT](LICENSE) 

## Docker部署

### 系统要求

- Docker 19.03+
- Docker Compose 1.27+

### 快速开始

1. 克隆项目代码
```bash
git clone <项目仓库地址>
cd ssg-web
```

2. 配置环境变量
```bash
# 复制示例环境变量文件（如果需要修改）
cp .env.example .env
# 编辑环境变量文件，设置API地址等配置
nano .env
```

3. 构建并启动容器
```bash
docker compose up -d
```

4. 验证部署
在浏览器中访问 `http://localhost:3006`

### 环境变量说明

- `NEXT_PUBLIC_API_URL`: 后端API服务地址（默认值：`http://localhost:8000`）
- `NODE_ENV`: 运行环境（生产环境应设置为`production`）

### Docker Compose配置

项目使用了多阶段构建的Dockerfile，通过Docker Compose进行管理：

1. **构建阶段（builder）**：安装依赖并编译源代码
2. **运行阶段（runner）**：使用轻量级容器运行编译后的应用

### 容器管理命令

```bash
# 查看容器日志
docker logs ssg-web

# 重启容器
docker compose restart next-app

# 停止容器
docker compose stop

# 停止并移除容器
docker compose down

# 重新构建应用（代码更新后）
docker compose build next-app
docker compose up -d
```

### 数据持久化

Next.js应用缓存通过Docker卷进行持久化：
```yaml
volumes:
  next-app-data:/app/.next/cache
```

### 注意事项

1. Docker容器以非root用户（nextjs）运行，提高安全性
2. 应用于外部API服务的通信依赖于`NEXT_PUBLIC_API_URL`环境变量
3. 生产环境部署时，建议配置反向代理服务器（如Nginx）进行SSL终结和负载均衡 