# 使用多阶段构建优化镜像大小和构建过程

# 阶段1: 依赖安装和应用构建
FROM node:16-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装依赖
COPY package.json package-lock.json ./
RUN npm ci

# 复制源代码
COPY . .

# 构建应用
ENV NODE_ENV=production
RUN npm run build

# 阶段2: 仅保留生产运行所需的文件
FROM node:16-alpine AS runner

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3109

# 添加非root用户运行应用增强安全性
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# 从builder阶段复制必要的文件
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# 暴露端口
EXPOSE 3109

# 健康检查
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3109/api/health || exit 1

# 启动应用
CMD ["npm", "start"] 