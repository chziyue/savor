/**
 * Savor - 依赖注入接口定义
 * 定义各模块的接口类型，便于测试和替换实现
 */

import type { SavorConfig } from '../config/index.js';

/**
 * 日志接口
 */
export interface ILogger {
  info(message: string, meta?: object): void;
  warn(message: string, meta?: object): void;
  error(message: string, meta?: object): void;
  debug(message: string, meta?: object): void;
}

/**
 * 循环保护接口
 */
export interface ILoopGuard {
  check(requestId: string): { isLoop: boolean; count: number };
  getCachedResponse(requestId: string): string | null;
  setCachedResponse(requestId: string, response: string): void;
  clear(): void;
}

/**
 * 限流器接口
 */
export interface IRateLimiter {
  check(clientId: string): { 
    allowed: boolean; 
    remaining?: number; 
    retryAfter?: number;
    resetTime?: string;
  };
  reset(clientId?: string): number;
  getLockedClients(): Array<{ clientId: string; lockedSince: string }>;
}

/**
 * 追踪日志接口
 */
export interface ITraceLogger {
  logStep(traceId: string, step: number, data: object): void;
  logComplete(traceId: string, data: object): void;
}

/**
 * 统计记录接口
 */
export interface IStats {
  record(data: {
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
  }): void;
}

/**
 * 代理服务器依赖
 */
export interface ProxyDependencies {
  logger: ILogger;
  loopGuard?: ILoopGuard;
  rateLimiter?: IRateLimiter;
  traceLogger?: ITraceLogger;
  stats?: IStats;
}

/**
 * 代理服务器选项
 */
export interface ProxyOptions {
  config: SavorConfig;
  deps?: Partial<ProxyDependencies>;
}