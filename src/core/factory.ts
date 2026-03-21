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
  record(data: any) {
    // 转换为 recordRequest 需要的格式
    recordRequest({
      ...data,
      totalTokens: data.tokens,
      id: data.requestId,
      timestamp: new Date().toISOString(),
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

  // 循环保护
  if (config.features?.loopGuard !== false) {
    const lgConfig = config.loopGuardConfig || {
      cacheAfter: 2,
      stopAfter: 4,
      countWindow: 60000,
      cacheTtl: 300000
    };
    deps.loopGuard = new LoopGuard(lgConfig) as unknown as ILoopGuard;
  }

  // 限流器
  if (config.features?.rateLimit !== false && config.rateLimitConfig) {
    deps.rateLimiter = new RateLimiter(config.rateLimitConfig) as unknown as IRateLimiter;
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