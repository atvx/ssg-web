# 使用多阶段构建优化镜像大小和构建过程

# 阶段1: 依赖安装和应用构建
FROM node:16-alpine AS builder

# 设置工作目录
WORKDIR /app

# 设置Node内存限制，适应低内存环境
ENV NODE_OPTIONS="--max-old-space-size=512"
# 禁用Next.js遥测
ENV NEXT_TELEMETRY_DISABLED=1
# 强制使用Babel而不是SWC来构建，解决SWC二进制兼容性问题
ENV NEXT_SKIP_NATIVE_POSTINSTALL=1
ENV NEXT_SKIP_NATIVE_MINIFY=1

# 重要：在构建阶段注入API URL
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# 安装依赖
COPY package.json package-lock.json ./
# 使用更轻量的安装方式替代npm ci
RUN npm install --no-optional --no-fund --no-audit --production=false

# 复制源代码
COPY . .

# 构建应用
ENV NODE_ENV=production
# 显示API URL，方便调试
RUN echo "Building with NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}"
# 使用低内存构建脚本替代原本的构建命令
RUN npm run build:lowmem || npm run build

# 阶段2: 仅保留生产运行所需的文件
FROM node:16-alpine AS runner

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3109
# 运行时内存限制更小
ENV NODE_OPTIONS="--max-old-space-size=256"

# 添加非root用户运行应用增强安全性
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# 从builder阶段复制必要的文件
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# 只复制生产环境所需的node_modules
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# 暴露端口
EXPOSE 3109

# 健康检查
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3109/api/health || exit 1

# 启动应用
CMD ["npm", "start"] 