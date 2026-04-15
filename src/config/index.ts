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
  upstream: 'https://api.example.com/v1',
  upstreamAppendV1: true,           // OpenAI upstream 是否自动追加 /v1
  // Anthropic upstream / Anthropic 上游地址
  // 阿里云百炼官方格式：https://coding.dashscope.aliyuncs.com/apps/anthropic（不带 /v1）
  anthropicUpstream: 'https://api.anthropic.com',
  anthropicUpstreamAppendV1: true,  // Anthropic upstream 是否自动追加 /v1
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
  upstreamAppendV1: boolean;
  anthropicUpstream?: string;
  anthropicUpstreamAppendV1: boolean;
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
export function startConfigWatcher(onUpdate?: (updatedKeys: string[]) => void): void {
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
 */
function reloadHotConfig(onUpdate?: (updatedKeys: string[]) => void): void {
  const configPath = path.join(process.cwd(), 'config.js');

  try {
    // 清除 require 缓存
    delete require.cache[require.resolve(configPath)];
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const newUserConfig = require(configPath);

    const updatedKeys: string[] = [];

    // 只更新支持的配置项
    // 上游地址配置
    if (newUserConfig.upstream !== undefined) {
      Config.upstream = newUserConfig.upstream;
      updatedKeys.push('upstream');
    }
    if (newUserConfig.upstreamAppendV1 !== undefined) {
      Config.upstreamAppendV1 = newUserConfig.upstreamAppendV1;
      updatedKeys.push('upstreamAppendV1');
    }
    if (newUserConfig.anthropicUpstream !== undefined) {
      Config.anthropicUpstream = newUserConfig.anthropicUpstream;
      updatedKeys.push('anthropicUpstream');
    }
    if (newUserConfig.anthropicUpstreamAppendV1 !== undefined) {
      Config.anthropicUpstreamAppendV1 = newUserConfig.anthropicUpstreamAppendV1;
      updatedKeys.push('anthropicUpstreamAppendV1');
    }

    // 模型/API Key 替换配置
    if (newUserConfig.modelOverride !== undefined) {
      Config.modelOverride = newUserConfig.modelOverride;
      updatedKeys.push('modelOverride');
    }
    if (newUserConfig.anthropicModelOverride !== undefined) {
      Config.anthropicModelOverride = newUserConfig.anthropicModelOverride;
      updatedKeys.push('anthropicModelOverride');
    }
    if (newUserConfig.apiKeyOverride !== undefined) {
      Config.apiKeyOverride = newUserConfig.apiKeyOverride;
      updatedKeys.push('apiKeyOverride');
    }
    if (newUserConfig.anthropicApiKeyOverride !== undefined) {
      Config.anthropicApiKeyOverride = newUserConfig.anthropicApiKeyOverride;
      updatedKeys.push('anthropicApiKeyOverride');
    }

    if (updatedKeys.length > 0) {
      logger.info('[ConfigWatcher] 配置已热更新', { updatedKeys });
      onUpdate?.(updatedKeys);
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('[ConfigWatcher] 重新加载配置失败', { error });
  }
}

