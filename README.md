# 销售助手应用

一个自适应PC和移动端的销售数据管理系统，帮助销售人员实时查看数据、管理目标和导出报表。

## 主要功能

- **用户管理**: 注册、登录、个人信息修改、密码管理
- **销售数据**: 多平台销售数据同步与展示、日均销售分析
- **目标管理**: 月度销售目标设置与跟踪、完成率分析
- **报表功能**: 日报导出（Excel、PDF、图片）、销售趋势图表
- **任务系统**: 异步任务管理与状态监控
- **组织管理**: 多级机构管理与数据权限控制
- **数据可视化**: 日销售图表、周销售趋势、订单数量分析

## 技术栈

- **前端框架**: React.js、Next.js 13.4、TypeScript 5.1
- **UI组件**: TailwindCSS 3.3、Ant Design 5.2、Headless UI
- **图表库**: ECharts 5.6、Chart.js 4.3、React-Chartjs-2
- **状态管理**: React Context API + SWR 2.1
- **网络请求**: Axios 1.4
- **表单处理**: React Hook Form 7.4
- **日期处理**: Date-fns 2.3、Moment.js、Dayjs
- **身份验证**: JWT认证、Cookie管理
- **响应式设计**: 使用Tailwind的响应式工具，自适应PC和移动端
- **导出功能**: html2canvas用于图表导出

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

### 代码检查

```bash
npm run lint
```

## Docker部署

### 准备工作

1. 复制环境变量示例文件并修改
```bash
cp docker.env.example docker.env.dev
```

2. 编辑环境变量，设置正确的API地址
```bash
# 修改docker.env.dev，设置API地址
# 必须同时设置两个变量
API_URL=http://你的API服务器地址
NEXT_PUBLIC_API_URL=http://你的API服务器地址
```

3. 使用部署脚本
```bash
# 给脚本执行权限
chmod +x docker-deploy.sh

# 构建并部署（重要：必须使用-b参数重新构建镜像，才能应用新的API地址）
./docker-deploy.sh -e dev -b
```

### 环境变量说明

- `API_URL` 和 `NEXT_PUBLIC_API_URL`: 必须同时设置为相同的API服务器地址
- `NEXT_PUBLIC_WS_URL`: WebSocket连接地址
- `PORT`: 应用端口号(默认3109)

### 重要提示

- **每次修改API地址后必须使用`-b`参数重新构建Docker镜像**
- 环境变量文件(`docker.env.*`)不会被提交到Git仓库，确保安全性
- 只有`docker.env.example`示例文件会被提交，请勿在此文件中设置实际的API地址

## 项目结构

```
├── components/          # React组件
│   ├── auth/            # 认证相关组件（登录、注册表单）
│   ├── dashboard/       # 仪表板组件
│   ├── layout/          # 布局组件
│   ├── sales/           # 销售数据相关组件（图表、表格、报表）
│   └── ui/              # 通用UI组件（按钮、卡片等）
├── contexts/            # React上下文（认证状态管理）
├── hooks/               # 自定义Hooks
├── lib/                 # 工具函数和API客户端
├── pages/               # Next.js页面
│   ├── api/             # API路由
│   ├── auth/            # 认证相关页面
│   ├── organizations/   # 组织管理页面
│   ├── sales/           # 销售数据、目标、报表页面
│   ├── settings/        # 设置页面
│   └── tasks/           # 任务管理页面
├── public/              # 静态资源
├── styles/              # 全局样式（Tailwind配置）
├── types/               # TypeScript类型定义
└── utils/               # 辅助函数
```

## 主要页面

- **登录/注册**: 用户认证
- **仪表板**: 销售数据概览、今日销售额、订单数统计
- **销售数据**: 详细销售数据展示与筛选、多平台数据整合
- **目标管理**: 销售目标设置与进度跟踪、完成率分析
- **报表中心**: 日报表生成与导出（支持Excel、PDF、图片格式）
- **任务中心**: 异步任务监控与管理
- **个人设置**: 用户信息与密码管理
- **组织管理**: 机构管理（管理员）、组织架构设置

## 数据可视化

项目使用多种图表类型展示销售数据：
- 日销售趋势图
- 周销售对比图
- 订单数量分析图
- 日均销售分析
- 销售目标完成率展示
- 平台销售占比分析

## API模块

项目API分为以下几个主要模块：
- 认证相关API（登录、注册、个人信息管理）
- 销售数据API（数据查询、同步、统计）
- 销售目标API（目标设置、完成率查询）
- 任务管理API（任务创建、状态查询）
- 组织机构API（组织创建、更新、查询）

## 浏览器支持

- Chrome (最新版)
- Firefox (最新版)
- Safari (最新版)
- Edge (最新版)
- 移动浏览器

## 授权协议

[MIT](LICENSE) 
