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
 * Savor - Configuration Module
 * Loads config.js from root directory, falls back to defaults
 */

import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

// ==================== Default Configuration ====================

const defaultConfig = {
  // Common configuration
  upstream: 'https://api.example.com',
  upstreamSuffix: '/v1/chat/completions',  // OpenAI 协议后缀
  // Anthropic upstream / Anthropic 上游地址
  anthropicUpstream: 'https://api.anthropic.com',
  anthropicUpstreamSuffix: '/v1/messages',  // Anthropic 协议后缀
  port: 3456,
  host: '0.0.0.0',
  modelOverride: {
    enabled: false,
    model: ''
  },
  anthropicModelOverride: {
    enabled: false,
    model: ''
  },
  apiKeyOverride: {
    enabled: false,
    apiKey: ''
  },
  anthropicApiKeyOverride: {
    enabled: false,
    apiKey: ''
  },
  cors: {
    allowedOrigins: ['http://localhost:3456', 'http://127.0.0.1:3456'],
    credentials: true,
    maxAge: 86400
  },
  https: {
    enabled: false,
    port: 3457,
    keyPath: './certs/key.pem',
    certPath: './certs/cert.pem'
  },

  // Advanced configuration
  features: {
    stats: true,
    webDashboard: true
  },
  contextTruncation: {
    enabled: false,
    maxRounds: 20
  },
  contentFilter: {
    enabled: true,
    categories: { privacy: true },
    replacements: { privacy: '<privacy-filtered>' }
  },
  loopGuard: {
    enabled: true,
    stopAfter: 3,
    countWindow: 60000
  },
  rateLimit: {
    enabled: true,
    requestsPerMinute: 30,
    windowMs: 60000,
    permanentLock: 60
  },
  logLevel: 'info',
  logDir: './logs',
  timeout: { upstream: 300000 },
  dashboard: { refreshInterval: 5000, theme: 'glass' as const },
  tokenEstimation: {
    chineseChar: 1.0,
    englishChar: 0.5,
    digitChar: 0.6,
    jsonStructChar: 0.7
  },
  fullTrace: {
    enabled: false,
    traceDir: './traces',
    maxFileSize: 100 * 1024 * 1024
  },
  commands: {
    enabled: false,
    prefix: '\\'
  }
};

// ==================== Type Definitions ====================

export interface CommandsConfig {
  enabled: boolean;
  prefix?: string;  // 命令前缀，默认 '\\'
}

export interface SavorConfig {
  upstream: string;
  upstreamSuffix?: string;  // 自定义后缀，默认 /v1/chat/completions
  anthropicUpstream?: string;
  anthropicUpstreamSuffix?: string;  // 自定义后缀，默认 /v1/messages
  port: number;
  host: string;
  logLevel: string;
  logDir: string;
  modelOverride?: { enabled: boolean; model: string };
  anthropicModelOverride?: { enabled: boolean; model: string };
  apiKeyOverride?: { enabled: boolean; apiKey: string };
  anthropicApiKeyOverride?: { enabled: boolean; apiKey: string };
  commands?: CommandsConfig;
  cors?: {
    allowedOrigins: string[];
    credentials: boolean;
    maxAge: number;
  };
  https?: {
    enabled: boolean;
    port: number;
    keyPath: string;
    certPath: string;
  };
  features: {
    stats: boolean;
    webDashboard: boolean;
    rateLimit?: boolean;     // 兼容旧格式
    loopGuard?: boolean;     // 兼容旧格式
  };
  loopGuard?: {
    enabled?: boolean;
    stopAfter?: number;
    countWindow?: number;
  };
  loopGuardConfig?: {        // 兼容旧格式
    stopAfter: number;
    countWindow: number;
  };
  rateLimit?: {
    enabled?: boolean;
    requestsPerMinute?: number;
    windowMs?: number;
    permanentLock?: boolean | number;
  };
  rateLimitConfig?: {        // 兼容旧格式
    requestsPerMinute: number;
    windowMs?: number;
    permanentLock?: boolean | number;
  };
  contextTruncation?: {
    enabled: boolean;
    maxRounds: number;
    tokenEstimation?: {
      chineseChar: number;
      englishChar: number;
      digitChar: number;
      jsonStructChar: number;
    };
  };
  contentFilter?: {
    enabled: boolean;
    categories: { privacy: boolean };
    replacements: { privacy: string };
  };
  timeout?: { upstream: number };
  dashboard?: { refreshInterval: number; theme?: 'cyber' | 'glass' };
  tokenEstimation?: {
    chineseChar: number;
    englishChar: number;
    digitChar: number;
    jsonStructChar: number;
  };
  fullTrace?: {
    enabled: boolean;
    traceDir: string;
    maxFileSize: number;
  };
}

// ==================== Load Configuration ====================

function loadUserConfig(): Partial<SavorConfig> {
  const configPath = path.join(process.cwd(), 'config.js');
  
  if (fs.existsSync(configPath)) {
    try {
      delete require.cache[require.resolve(configPath)];
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const userConfig = require(configPath);
      logger.info('[Config] Loaded config.js');
      return userConfig;
    } catch {
      logger.warn('[Config] Failed to load config.js, using defaults');
    }
  }
  
  return {};
}

export const Config: SavorConfig = { ...defaultConfig, ...loadUserConfig() } as SavorConfig;

export function loadConfig(): SavorConfig {
  return Config;
}

// ==================== Config File Watcher ====================

let watcher: fs.FSWatcher | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 启动配置文件监听
 * 当 config.js 文件变化时，自动重新加载支持的配置项
 */
export function startConfigWatcher(onUpdate?: (updatedKeys: string[], newConfig: Partial<SavorConfig>) => void): void {
  const configPath = path.join(process.cwd(), 'config.js');

  if (!fs.existsSync(configPath)) {
    logger.info('[ConfigWatcher] config.js 不存在，跳过监听');
    return;
  }

  // 防抖处理，避免频繁触发
  const handleChange = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      reloadHotConfig(onUpdate);
    }, 1000);  // 1秒防抖
  };

  watcher = fs.watch(configPath, (eventType) => {
    if (eventType === 'change') {
      logger.info('[ConfigWatcher] config.js 文件已变化');
      handleChange();
    }
  });

  watcher.on('error', (err) => {
    logger.error('[ConfigWatcher] 监听错误', { error: err.message });
  });

  logger.info('[ConfigWatcher] 已启动配置文件监听', { configPath });
}

/**
 * 停止配置文件监听
 */
export function stopConfigWatcher(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
    logger.info('[ConfigWatcher] 已停止配置文件监听');
  }
}

/**
 * 重新加载热更新配置项
 * @returns 更新后的配置对象（用于通知其他模块）
 */
function reloadHotConfig(onUpdate?: (updatedKeys: string[], newConfig: Partial<SavorConfig>) => void): void {
  const configPath = path.join(process.cwd(), 'config.js');

  try {
    // 清除 require 缓存
    delete require.cache[require.resolve(configPath)];
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const newUserConfig = require(configPath);

    const updatedKeys: string[] = [];
    const newConfig: Partial<SavorConfig> = {};

    // ==================== 上游地址配置 ====================
    if (newUserConfig.upstream !== undefined) {
      Config.upstream = newUserConfig.upstream;
      newConfig.upstream = newUserConfig.upstream;
      updatedKeys.push('upstream');
    }
    if (newUserConfig.upstreamSuffix !== undefined) {
      Config.upstreamSuffix = newUserConfig.upstreamSuffix;
      newConfig.upstreamSuffix = newUserConfig.upstreamSuffix;
      updatedKeys.push('upstreamSuffix');
    }
    if (newUserConfig.anthropicUpstream !== undefined) {
      Config.anthropicUpstream = newUserConfig.anthropicUpstream;
      newConfig.anthropicUpstream = newUserConfig.anthropicUpstream;
      updatedKeys.push('anthropicUpstream');
    }
    if (newUserConfig.anthropicUpstreamSuffix !== undefined) {
      Config.anthropicUpstreamSuffix = newUserConfig.anthropicUpstreamSuffix;
      newConfig.anthropicUpstreamSuffix = newUserConfig.anthropicUpstreamSuffix;
      updatedKeys.push('anthropicUpstreamSuffix');
    }

    // ==================== 模型/API Key 替换配置 ====================
    if (newUserConfig.modelOverride !== undefined) {
      Config.modelOverride = newUserConfig.modelOverride;
      newConfig.modelOverride = newUserConfig.modelOverride;
      updatedKeys.push('modelOverride');
    }
    if (newUserConfig.anthropicModelOverride !== undefined) {
      Config.anthropicModelOverride = newUserConfig.anthropicModelOverride;
      newConfig.anthropicModelOverride = newUserConfig.anthropicModelOverride;
      updatedKeys.push('anthropicModelOverride');
    }
    if (newUserConfig.apiKeyOverride !== undefined) {
      Config.apiKeyOverride = newUserConfig.apiKeyOverride;
      newConfig.apiKeyOverride = newUserConfig.apiKeyOverride;
      updatedKeys.push('apiKeyOverride');
    }
    if (newUserConfig.anthropicApiKeyOverride !== undefined) {
      Config.anthropicApiKeyOverride = newUserConfig.anthropicApiKeyOverride;
      newConfig.anthropicApiKeyOverride = newUserConfig.anthropicApiKeyOverride;
      updatedKeys.push('anthropicApiKeyOverride');
    }

    // ==================== 循环保护配置 ====================
    if (newUserConfig.loopGuard !== undefined) {
      Config.loopGuard = { ...Config.loopGuard, ...newUserConfig.loopGuard };
      newConfig.loopGuard = newUserConfig.loopGuard;
      updatedKeys.push('loopGuard');
    }

    // ==================== 限流配置 ====================
    if (newUserConfig.rateLimit !== undefined) {
      Config.rateLimit = { ...Config.rateLimit, ...newUserConfig.rateLimit };
      newConfig.rateLimit = newUserConfig.rateLimit;
      updatedKeys.push('rateLimit');
    }

    // ==================== 内容过滤配置 ====================
    if (newUserConfig.contentFilter !== undefined) {
      Config.contentFilter = { ...Config.contentFilter, ...newUserConfig.contentFilter };
      newConfig.contentFilter = newUserConfig.contentFilter;
      updatedKeys.push('contentFilter');
    }

    // ==================== 上下文截断配置 ====================
    if (newUserConfig.contextTruncation !== undefined) {
      Config.contextTruncation = { ...Config.contextTruncation, ...newUserConfig.contextTruncation };
      newConfig.contextTruncation = newUserConfig.contextTruncation;
      updatedKeys.push('contextTruncation');
    }

    // ==================== Token 估算配置 ====================
    if (newUserConfig.tokenEstimation !== undefined) {
      Config.tokenEstimation = { ...Config.tokenEstimation, ...newUserConfig.tokenEstimation };
      newConfig.tokenEstimation = newUserConfig.tokenEstimation;
      updatedKeys.push('tokenEstimation');
    }

    // ==================== 超时配置 ====================
    if (newUserConfig.timeout !== undefined) {
      Config.timeout = { ...Config.timeout, ...newUserConfig.timeout };
      newConfig.timeout = newUserConfig.timeout;
      updatedKeys.push('timeout');
    }

    // ==================== 命令系统配置 ====================
    if (newUserConfig.commands !== undefined) {
      Config.commands = { ...Config.commands, ...newUserConfig.commands };
      newConfig.commands = newUserConfig.commands;
      updatedKeys.push('commands');
    }

    // ==================== CORS 配置 ====================
    if (newUserConfig.cors !== undefined) {
      Config.cors = { ...Config.cors, ...newUserConfig.cors };
      newConfig.cors = newUserConfig.cors;
      updatedKeys.push('cors');
    }

    // ==================== Dashboard 配置 ====================
    if (newUserConfig.dashboard !== undefined) {
      Config.dashboard = { ...Config.dashboard, ...newUserConfig.dashboard };
      newConfig.dashboard = newUserConfig.dashboard;
      updatedKeys.push('dashboard');
    }

    // ==================== 全链路追踪配置 ====================
    if (newUserConfig.fullTrace !== undefined) {
      Config.fullTrace = { ...Config.fullTrace, ...newUserConfig.fullTrace };
      newConfig.fullTrace = newUserConfig.fullTrace;
      updatedKeys.push('fullTrace');
    }

    // ==================== 日志级别 ====================
    if (newUserConfig.logLevel !== undefined) {
      Config.logLevel = newUserConfig.logLevel;
      newConfig.logLevel = newUserConfig.logLevel;
      updatedKeys.push('logLevel');
      // 更新 logger 的日志级别
      import('../utils/logger.js').then(module => {
        module.updateLogLevel?.(newUserConfig.logLevel);
      });
    }

    if (updatedKeys.length > 0) {
      logger.info('[ConfigWatcher] 配置已热更新', { updatedKeys });
      onUpdate?.(updatedKeys, newConfig);
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('[ConfigWatcher] 重新加载配置失败', { error });
  }
}

