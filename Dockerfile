# 多阶段构建，减小镜像体积
FROM node:24-alpine AS builder

# 安装编译依赖（better-sqlite3 需要）
RUN apk add --no-cache python3 make g++

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制源码并构建
COPY . .
RUN npm run build

# 生产镜像
FROM node:24-alpine

# 安装运行时依赖（better-sqlite3 需要）
RUN apk add --no-cache libstdc++

WORKDIR /app

# 复制编译后的文件
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# 创建必要目录
RUN mkdir -p logs data certs

# 暴露端口
EXPOSE 3456 3457

# 启动服务
CMD ["node", "dist/index.js"]
