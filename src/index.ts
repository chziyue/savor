#!/usr/bin/env node
/*
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Savor
 *
 * This file is part of Savor.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 */
/**
 * Savor - 主入口
 * OpenClaw LLM Proxy Gateway
 */

import express from 'express';
import { VERSION } from './version.js';
import helmet from 'helmet';
import https from 'https';
import { loadConfig, startConfigWatcher } from './config/index.js';
import { ProxyServer } from './core/proxy.js';
import { logger } from './utils/logger.js';
import { createWebServer } from './web/server.js';
import { errorHandler, notFoundHandler, asyncHandler } from './utils/error-handler.js';
import fs from 'fs';
import path from 'path';
import { RateLimiter } from './utils/rate-limiter.js';

// 确保日志目录存在
function ensureLogDir(logDir: string) {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
    logger.info(`创建日志目录: ${logDir}`);
  }
}

// 确保追踪目录存在
function ensureTraceDir(config: any) {
  if (config.fullTrace?.enabled && config.fullTrace?.traceDir) {
    const traceDir = config.fullTrace.traceDir;
    if (!fs.existsSync(traceDir)) {
      fs.mkdirSync(traceDir, { recursive: true });
      logger.info(`创建追踪目录: ${traceDir}`);
    }
  }
}

async function main() {
  // 加载配置
  const config = loadConfig();
  
  // 确保日志目录
  ensureLogDir(config.logDir);
  
  // 确保追踪目录（如果启用）
  ensureTraceDir(config);
  
  // 创建 Express 应用
  const app = express();
  
  // ==================== 安全中间件 ====================
  // Helmet 安全头
  app.use(helmet({
    contentSecurityPolicy: false, // API 服务不需要 CSP
    crossOriginEmbedderPolicy: false,
  }));
  
  // CORS 白名单验证
  const corsConfig = config.cors!;
  
  // 支持环境变量覆盖白名单
  const allowedOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
    : corsConfig.allowedOrigins;
  
  // 自定义 CORS 中间件
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // 服务端调用（无 Origin 头）自动放行
    if (!origin) {
      return next();
    }
    
    // 白名单验证
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', String(corsConfig.credentials));
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Max-Age', String(corsConfig.maxAge));
      
      // 预检请求直接返回
      if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
      }
      
      return next();
    }
    
    // 拒绝非白名单来源
    logger.warn(`[CORS] 拒绝来源: ${origin}`, { 
      allowedOrigins,
      path: req.path 
    });
    res.status(403).json({ 
      error: 'Forbidden', 
      message: 'Origin not allowed',
      origin 
    });
  });
  
  // JSON 解析
  app.use(express.json({ limit: '50mb' }));
  
  // ==================== 业务逻辑 ====================
  // 创建代理服务器
  const proxy = new ProxyServer(config);
  
  // 健康检查端点
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'savor',
      version: VERSION,
      config: 'default',
      timestamp: new Date().toISOString()
    });
  });
  
  // 统计信息端点
  app.get('/stats', (req, res) => {
    res.json({
      message: '统计功能开发中...',
      phase: 'Phase 2'
    });
  });
  
  // 限流状态查询端点
  app.get('/rate-limit/status', asyncHandler(async (req, res) => {
    const clientId = req.query.clientId as string | undefined;
    
    if (clientId) {
      res.json(proxy.getClientRateLimitStatus(clientId));
    } else {
      res.json({
        totalClients: proxy.getRateLimitClientCount(),
        lockedClients: proxy.getLockedClients(),
        allClients: proxy.getAllRateLimitStatus()
      });
    }
  }));
  
  // 限流手动重置端点
  app.post('/rate-limit/reset', asyncHandler(async (req, res) => {
    const clientId = req.query.clientId as string | undefined;
    const all = req.query.all === 'true';

    const result = all ? proxy.resetAllRateLimits() : proxy.resetRateLimit(clientId);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  }));

  // Web 监控看板
  if (config.features.webDashboard) {
    const webRouter = createWebServer();
    app.use('/', webRouter);
    logger.info('Web 监控看板已启用: http://' + config.host + ':' + config.port + '/');
  }
  
  // 主要转发端点
  app.post('/v1/chat/completions', asyncHandler(async (req, res) => {
    await proxy.handleRequest(req, res);
  }));

  // Anthropic 协议端点
  app.post('/v1/messages', asyncHandler(async (req, res) => {
    await proxy.handleAnthropicRequest(req, res);
  }));
  
  // ==================== 错误处理 ====================
  // 404 处理
  app.use(notFoundHandler);
  
  // 全局错误处理
  app.use(errorHandler);
  
  // ==================== 启动服务 ====================
  // HTTP 服务
  app.listen(config.port, config.host, () => {
    logger.info('========================================');
    logger.info('Savor 代理服务器已启动');
    logger.info(`HTTP:  http://${config.host}:${config.port}`);
    if (config.https?.enabled) {
      logger.info(`HTTPS: https://${config.host}:${config.https.port}`);
    }
    logger.info(`OpenAI 上游: ${config.upstream}`);
    if (config.anthropicUpstream) {
      logger.info(`Anthropic 上游: ${config.anthropicUpstream}`);
    }
    logger.info(`配置: default`);
    logger.info(`安全: helmet + CORS白名单 + 验证`);
    logger.info(`CORS白名单: ${allowedOrigins.join(', ')}`);
    logger.info('========================================');
  });
  
  // HTTPS 服务
  if (config.https?.enabled) {
    const httpsConfig = config.https;
    const keyPath = path.resolve(process.cwd(), httpsConfig.keyPath);
    const certPath = path.resolve(process.cwd(), httpsConfig.certPath);
    
    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
      logger.error(`HTTPS 证书文件不存在: key=${keyPath}, cert=${certPath}`);
      logger.error('请检查 config.js 中的 https.keyPath 和 https.certPath 配置');
    } else {
      const httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      };
      
      https.createServer(httpsOptions, app).listen(httpsConfig.port, config.host, () => {
        logger.info(`HTTPS 服务已启动: https://${config.host}:${httpsConfig.port}`);
      });
    }
  }

  // 启动配置文件监听（热更新）
  startConfigWatcher((updatedKeys) => {
    logger.info('[ConfigWatcher] 配置已热更新', { updatedKeys });
  });
}

// 进程错误处理
process.on('uncaughtException', (err) => {
  logger.error('未捕获的异常', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝', { reason, promise });
});

// 启动
main().catch(err => {
  logger.error('启动失败', { error: err.message });
  process.exit(1);
});