# Savor

> 面向 OpenClaw 的 LLM 代理网关 - 省钱、省 Token、实时监控

[English](README.md) | [中文](#中文)

## 简介

Savor 是一个轻量级的 LLM 代理网关，位于 OpenClaw 和大模型 API 之间，提供循环保护、限流控制、成本监控等功能。

## 功能特点

- **透明代理** - 转发 OpenClaw 到大模型 API 的所有请求
- **循环保护** - 自动检测并打断工具调用无限循环，避免 Token 浪费
- **限流控制** - 基于客户端 IP 独立限流，支持永久锁定或定时解锁
- **上下文截断** - 只保留最近 N 轮对话，节省 Token
- **隐私过滤** - 自动过滤手机号、身份证、邮箱等敏感信息
- **实时监控** - Web 看板显示请求统计、Token 消耗、成本分析
- **HTTPS 支持** - 双端口运行，支持自签名证书或自有域名证书
- **API Key 保护** - 替换 API Key，真实 Key 仅存储在 Savor

![Dashboard](docs/1.png)

![Stats](docs/2.png)

![Logs](docs/3.png)

## 快速开始

### 安装

```bash
git clone https://github.com/your-repo/savor.git
cd savor
npm install
npm run build
```

### 配置

修改 `config.js`：

```javascript
module.exports = {
  upstream: 'https://api.example.com/v1',  // 上游 API 地址
  port: 3456,
  host: '0.0.0.0',
  
  modelOverride: { enabled: false, model: '' },
  apiKeyOverride: { enabled: false, apiKey: '' }
};
```

> **提示**：`config.js` 注释使用中英双语，未安装中文语言包的编辑器可能显示乱码，无需理会，不影响使用。

## 启动方式

### 方式一：直接启动

适合开发测试，关闭终端后进程结束。

| 操作 | 命令 |
|------|------|
| 启动 | `npm start` |
| 停止 | `Ctrl + C` |

### 方式二：PM2 启动（推荐）

适合生产环境，后台运行，自动重启。

**安装 PM2**：
```bash
npm install -g pm2
```

**常用命令**：

| 操作 | 命令 |
|------|------|
| 启动 | `pm2 start ecosystem.config.js` |
| 停止 | `pm2 stop savor` |
| 重启 | `pm2 restart savor` |
| 查看状态 | `pm2 status` |
| 查看日志 | `pm2 logs savor` |
| 查看实时日志 | `pm2 logs savor --lines 50` |
| 开机自启 | `pm2 startup` 然后 `pm2 save` |

### 访问监控看板

```
http://localhost:3456/
```

## 与 OpenClaw 集成

```json
// ~/.openclaw/openclaw.json
{
  "models": {
    "providers": {
      "qwen": {
        "baseUrl": "http://your-server:3456/v1",
        "apiKey": "sk-xxx"
      }
    }
  }
}
```

**注意**：代理地址使用 `/v1` 结尾。

## HTTPS 配置

### 自签名证书

```bash
mkdir -p certs
openssl req -x509 -nodes -days 36500 -newkey rsa:2048 \
  -keyout certs/key.pem -out certs/cert.pem \
  -subj "/C=CN/O=Savor/CN=savor.local" \
  -addext "subjectAltName=IP:192.168.1.100"
chmod 600 certs/key.pem
```

macOS 需配置环境变量跳过证书验证：

```bash
plutil -insert EnvironmentVariables.NODE_TLS_REJECT_UNAUTHORIZED -string "0" ~/Library/LaunchAgents/ai.openclaw.gateway.plist
launchctl unload ~/Library/LaunchAgents/ai.openclaw.gateway.plist
launchctl load ~/Library/LaunchAgents/ai.openclaw.gateway.plist
```

### 自有域名证书

将证书放入 `certs/` 目录，修改 `config.js`：

```javascript
https: {
  enabled: true,
  port: 3457,
  keyPath: './certs/key.pem',
  certPath: './certs/cert.pem'
}
```

## 使用 Docker 启动（推荐）

无需安装 Node.js，直接使用 Docker 部署。

### 步骤

```bash
# 1. 创建目录
mkdir savor
cd savor

# 2. 下载配置文件
curl -O https://raw.githubusercontent.com/chziyue/savor/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/chziyue/savor/main/config.js

# 3. 修改配置文件，添加上游 API 地址
vim config.js
# 或使用其他编辑器修改 upstream 字段

# 4. 启动服务
docker compose up -d
```

### 常用命令

| 操作 | 命令 |
|------|------|
| 查看日志 | `docker compose logs -f` |
| 停止服务 | `docker compose down` |
| 重启服务 | `docker compose restart` |
| 更新镜像 | `docker compose pull && docker compose up -d` |

## 许可证

[MIT](LICENSE)

---

_Project: Savor_
_For: OpenClaw Ecosystem_