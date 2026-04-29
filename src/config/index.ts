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
  adminWhitelist: ['127.0.0.1'],
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
  adminWhitelist?: string[];  // 允许访问管理 API 的 IP 白名单，默认 ['127.0.0.1']
}

// ==================== Deep Merge Helper ====================

/**
 * 深合并两个对象（仅一层深度，覆盖嵌套对象内的字段而不是整体替换）
 */
function deepMerge<T extends Record<string, unknown>>(defaults: T, overrides: Partial<T>): T {
  const result = { ...defaults };
  for (const key of Object.keys(overrides) as Array<keyof T>) {
    const defaultVal = defaults[key];
    const overrideVal = overrides[key];
    if (
      defaultVal && overrideVal &&
      typeof defaultVal === 'object' && !Array.isArray(defaultVal) &&
      typeof overrideVal === 'object' && !Array.isArray(overrideVal)
    ) {
      // 嵌套对象：合并而非覆盖
      result[key] = { ...defaultVal, ...overrideVal } as T[keyof T];
    } else if (overrideVal !== undefined) {
      result[key] = overrideVal as T[keyof T];
    }
  }
  return result;
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

// 使用深合并，避免用户只写部分字段时丢失默认值
export const Config: SavorConfig = deepMerge(defaultConfig, loadUserConfig()) as SavorConfig;

export function loadConfig(): SavorConfig {
  return Config;
}

// ==================== Config File Watcher ====================

let watcher: fs.FSWatcher | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let lastConfigMtime: number = 0;

/**
 * 获取配置文件的修改时间
 */
function getConfigMtime(configPath: string): number {
  try {
    return fs.statSync(configPath).mtimeMs;
  } catch {
    return 0;
  }
}

/**
 * 创建 fs.watch watcher（带 rename 事件后自动重建）
 */
function createFsWatcher(configPath: string, handleChange: () => void): void {
  // 先关闭旧 watcher
  if (watcher) {
    try { watcher.close(); } catch { /* ignore */ }
    watcher = null;
  }

  // 文件不存在时等待
  if (!fs.existsSync(configPath)) {
    logger.warn('[ConfigWatcher] config.js 暂不存在，等待文件出现...');
    return;
  }

  try {
    watcher = fs.watch(configPath, (eventType) => {
      if (eventType === 'change' || eventType === 'rename') {
        logger.info('[ConfigWatcher] config.js 文件已变化', { eventType });
        handleChange();

        // rename 事件后 watcher 可能失效（编辑器原子写入：删旧文件 → 重命名新文件）
        // 延迟重建 watcher 以确保持续监听
        if (eventType === 'rename') {
          setTimeout(() => {
            createFsWatcher(configPath, handleChange);
          }, 300);
        }
      }
    });

    watcher.on('error', (err) => {
      logger.error('[ConfigWatcher] 监听错误，尝试重建', { error: err.message });
      // 出错后尝试重建
      setTimeout(() => {
        createFsWatcher(configPath, handleChange);
      }, 1000);
    });
  } catch (err) {
    logger.warn('[ConfigWatcher] fs.watch 创建失败，依赖轮询模式', {
      error: err instanceof Error ? err.message : String(err)
    });
  }
}

/**
 * 启动配置文件监听
 * 使用 fs.watch + 轮询双保险策略
 * - fs.watch: 低延迟，但在 Docker bind mount / 某些文件系统上不可靠
 * - 轮询: 作为 fallback，基于 mtime 检测变化，确保 Docker 环境下也能工作
 */
export function startConfigWatcher(onUpdate?: (updatedKeys: string[], newConfig: Partial<SavorConfig>) => void): void {
  const configPath = path.join(process.cwd(), 'config.js');

  if (!fs.existsSync(configPath)) {
    logger.info('[ConfigWatcher] config.js 不存在，跳过监听');
    return;
  }

  // 记录初始 mtime
  lastConfigMtime = getConfigMtime(configPath);

  // 防抖处理，避免频繁触发
  const handleChange = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      // 更新 mtime 记录（防止轮询重复触发）
      lastConfigMtime = getConfigMtime(configPath);
      reloadHotConfig(onUpdate);
    }, 1000);  // 1秒防抖
  };

  // 策略1: fs.watch（低延迟，带 rename 自动重建）
  createFsWatcher(configPath, handleChange);

  // 策略2: 轮询 fallback（每 3 秒检查 mtime）
  // 解决 Docker bind mount、某些网络文件系统下 fs.watch 不触发的问题
  pollTimer = setInterval(() => {
    try {
      const currentMtime = getConfigMtime(configPath);
      if (currentMtime > 0 && currentMtime !== lastConfigMtime) {
        logger.info('[ConfigWatcher] 轮询检测到 config.js 变化', {
          oldMtime: new Date(lastConfigMtime).toISOString(),
          newMtime: new Date(currentMtime).toISOString()
        });
        handleChange();
      }
    } catch {
      // stat 失败时静默处理
    }
  }, 3000);

  logger.info('[ConfigWatcher] 已启动配置文件监听（fs.watch + 轮询双保险）', { configPath });
}

/**
 * 停止配置文件监听
 */
export function stopConfigWatcher(): void {
  if (watcher) {
    try { watcher.close(); } catch { /* ignore */ }
    watcher = null;
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  logger.info('[ConfigWatcher] 已停止配置文件监听');
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

    // ==================== 管理白名单配置 ====================
    if (newUserConfig.adminWhitelist !== undefined) {
      Config.adminWhitelist = newUserConfig.adminWhitelist;
      newConfig.adminWhitelist = newUserConfig.adminWhitelist;
      updatedKeys.push('adminWhitelist');
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

