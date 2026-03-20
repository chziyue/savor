# Savor

> LLM Proxy Gateway for OpenClaw - Save Money, Save Tokens, Real-time Monitoring

[English](#english) | [中文](README_CN.md)

---

## Introduction

Savor is a lightweight LLM proxy gateway that sits between OpenClaw and LLM APIs, providing loop protection, rate limiting, cost monitoring, and more.

## Features

- **Transparent Proxy** - Forwards all requests from OpenClaw to LLM APIs
- **Loop Protection** - Automatically detects and breaks infinite tool call loops
- **Rate Limiting** - Per-client IP rate limiting with lock options
- **Context Truncation** - Keep only recent N rounds to save tokens
- **Privacy Filtering** - Auto-filter phone numbers, ID cards, emails, etc.
- **Real-time Monitoring** - Web dashboard with request stats, token usage, cost analysis
- **HTTPS Support** - Dual ports with self-signed or custom certificates
- **API Key Protection** - Replace API Key, real key stored only in Savor

![Dashboard](docs/1.png)

![Stats](docs/2.png)

![Logs](docs/3.png)

## Quick Start

### Install

```bash
git clone https://github.com/chziyue/savor.git
cd savor
npm install
npm run build
```

### Configuration

Edit `config.js`:

```javascript
module.exports = {
  upstream: 'https://api.example.com/v1',  // Upstream API URL
  port: 3456,
  host: '0.0.0.0',
  
  modelOverride: { enabled: false, model: '' },
  apiKeyOverride: { enabled: false, apiKey: '' }
};
```

## Startup Methods

### Method 1: Direct Start

For development, process ends when terminal closes.

| Action | Command |
|--------|---------|
| Start | `npm start` |
| Stop | `Ctrl + C` |

### Method 2: PM2 Start (Recommended)

For production, runs in background with auto-restart.

**Install PM2**:
```bash
npm install -g pm2
```

**Common Commands**:

| Action | Command |
|--------|---------|
| Start | `pm2 start ecosystem.config.js` |
| Stop | `pm2 stop savor` |
| Restart | `pm2 restart savor` |
| Status | `pm2 status` |
| Logs | `pm2 logs savor` |
| Real-time logs | `pm2 logs savor --lines 50` |
| Auto-start on boot | `pm2 startup` then `pm2 save` |

### Access Dashboard

```
http://localhost:3456/
```

## OpenClaw Integration

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

**Note**: Use `/v1` suffix for the proxy URL.

## HTTPS Configuration

### Self-signed Certificate

```bash
mkdir -p certs
openssl req -x509 -nodes -days 36500 -newkey rsa:2048 \
  -keyout certs/key.pem -out certs/cert.pem \
  -subj "/C=CN/O=Savor/CN=savor.local" \
  -addext "subjectAltName=IP:192.168.1.100"
chmod 600 certs/key.pem
```

For macOS, configure environment variable to skip certificate verification:

```bash
plutil -insert EnvironmentVariables.NODE_TLS_REJECT_UNAUTHORIZED -string "0" ~/Library/LaunchAgents/ai.openclaw.gateway.plist
launchctl unload ~/Library/LaunchAgents/ai.openclaw.gateway.plist
launchctl load ~/Library/LaunchAgents/ai.openclaw.gateway.plist
```

### Custom Domain Certificate

Put certificates in `certs/` directory, edit `config.js`:

```javascript
https: {
  enabled: true,
  port: 3457,
  keyPath: './certs/key.pem',
  certPath: './certs/cert.pem'
}
```

## Docker Deployment (Recommended)

No need to install Node.js, deploy with Docker directly.

### Steps

```bash
# 1. Create directory
mkdir savor
cd savor

# 2. Download configuration files
curl -O https://raw.githubusercontent.com/chziyue/savor/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/chziyue/savor/main/config.js

# 3. Edit config file, add upstream API URL
vim config.js
# Or use other editor to modify the upstream field

# 4. Start service
docker compose up -d
```

### Common Commands

| Action | Command |
|--------|---------|
| View logs | `docker compose logs -f` |
| Stop service | `docker compose down` |
| Restart service | `docker compose restart` |
| Update image | `docker compose pull && docker compose up -d` |

## License

[MIT](LICENSE)

---

_Project: Savor_
_For: OpenClaw Ecosystem_