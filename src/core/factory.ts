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
 * Savor - 依赖工厂
 * 提供默认的依赖实现
 */

import { logger } from '../utils/logger.js';
import { LoopGuard } from '../cache/index.js';
import { RateLimiter } from '../utils/rate-limiter.js';
import { TraceLogger } from '../utils/trace-logger.js';
import { recordRequest } from '../utils/stats.js';
import type { SavorConfig } from '../config/index.js';
import type { ProxyDependencies, ILogger, ILoopGuard, IRateLimiter, ITraceLogger, IStats } from './types.js';

interface StatsRecordData {
  requestId: string;
  model: string;
  tokens: number;
  duration: string;
  cost: string;
  status: 'success' | 'error' | 'rate_limited';
  promptTokens?: number;
  completionTokens?: number;
  contextTruncated?: boolean;
  savedTokens?: number;
  filtered?: boolean;
}

/**
 * Logger 适配器（包装现有的 logger）
 */
export class LoggerAdapter implements ILogger {
  info(message: string, meta?: object) { logger.info(message, meta); }
  warn(message: string, meta?: object) { logger.warn(message, meta); }
  error(message: string, meta?: object) { logger.error(message, meta); }
  debug(message: string, meta?: object) { logger.debug(message, meta); }
}

/**
 * Stats 适配器（包装现有的 recordRequest）
 */
export class StatsAdapter implements IStats {
  record(data: StatsRecordData) {
    // 转换为 recordRequest 需要的格式
    recordRequest({
      ...data,
      totalTokens: data.tokens,
      id: data.requestId,
      timestamp: Date.now(),
      promptTokens: data.promptTokens ?? 0,
      completionTokens: data.completionTokens ?? 0,
      duration: parseInt(data.duration, 10) || 0,
    });
  }
}

/**
 * 创建默认依赖
 */
export function createDependencies(config: SavorConfig): ProxyDependencies {
  const deps: ProxyDependencies = {
    logger: new LoggerAdapter(),
  };

  // 循环保护（兼容新旧配置格式）
  const loopGuardEnabled = config.loopGuard?.enabled ?? (config.features?.loopGuard !== false);
  if (loopGuardEnabled) {
    const lgConfig = config.loopGuard || config.loopGuardConfig || {
      stopAfter: 3,
      countWindow: 60000
    };
    deps.loopGuard = new LoopGuard(lgConfig) as unknown as ILoopGuard;
  }

  // 限流器（兼容新旧配置格式）
  const rateLimitEnabled = config.rateLimit?.enabled ?? (config.features?.rateLimit !== false);
  const rlConfig = config.rateLimit || config.rateLimitConfig;
  if (rateLimitEnabled && rlConfig?.requestsPerMinute) {
    deps.rateLimiter = new RateLimiter({
      requestsPerMinute: rlConfig.requestsPerMinute,
      windowMs: rlConfig.windowMs,
      permanentLock: rlConfig.permanentLock
    }) as unknown as IRateLimiter;
  }

  // 追踪日志
  if (config.fullTrace?.enabled) {
    deps.traceLogger = new TraceLogger(
      true,
      config.fullTrace.traceDir,
      config.fullTrace.maxFileSize
    ) as unknown as ITraceLogger;
  }

  // 统计
  deps.stats = new StatsAdapter();

  return deps;
}