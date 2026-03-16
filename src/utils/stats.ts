/**
 * Savor - 统计收集模块
 * 基于 SQLite + 日志双写
 */

import { logger } from './logger.js';
import { StatsDatabase, LogBackup, type RequestRecord } from '../db/index.js';
import { LoopGuard } from '../cache/index.js';

// 全局 LoopGuard 引用（由 proxy.ts 设置）
let loopGuardRef: LoopGuard | null = null;

export function setLoopGuard(guard: LoopGuard): void {
  loopGuardRef = guard;
}

// 模型单价配置（元/千 token）
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'kimi-k2.5': { input: 0.002, output: 0.006 },
  'gpt-3.5-turbo': { input:0.0015, output: 0.002 },
  'gpt-4': { input: 0.03, output: 0.06 },
  'default': { input: 0.002, output: 0.006 }
};

// 全局实例
let db: StatsDatabase | null = null;
let logBackup: LogBackup | null = null;

/**
 * 初始化统计模块
 */
export function initStats(): void {
  db = new StatsDatabase('./data/stats.db');
  logBackup = new LogBackup('./logs');
  logger.info('[Stats] 统计模块已初始化');
}

/**
 * 计算成本
 */
export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['default'];
  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  return inputCost + outputCost;
}

/**
 * 记录请求统计（SQLite + 日志双写）
 */
export function recordRequest(stats: RequestRecord): void {
  // 写入 SQLite
  try {
    db?.insertRequest(stats);
  } catch (error) {
    logger.error('[Stats] SQLite 写入失败', { error });
  }

  // 写入日志兜底
  try {
    logBackup?.append(stats);
  } catch (error) {
    logger.error('[Stats] 日志写入失败', { error });
  }

  // 记录到成本日志
  const cost = calculateCost(stats.model, stats.promptTokens, stats.completionTokens);
  logger.info('请求统计', {
    requestId: stats.id,
    model: stats.model,
    tokens: stats.totalTokens,
    duration: `${stats.duration}ms`,
    cost: `¥${cost.toFixed(4)}`,
    status: stats.status
  });
}

/**
 * 获取今日统计
 */
export function getTodayStats(): any {
  if (!db) return createEmptyDailyStats();
  
  const raw: any = db.getTodayStats();
  const cacheRaw: any = db.getTodayCacheStats(); // 获取缓存统计
  
  // 使用北京时间获取今日日期（格式：YYYY-MM-DD）
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;
  
  const totalRequests = raw?.total_requests || 0;
  const cacheHits = cacheRaw?.cache_hits || 0;
  const actualRequests = totalRequests - cacheHits; // 实际请求数（不含缓存命中）
  const totalTokens = raw?.total_tokens || 0;
  
  // 获取上下文裁切统计
  const contextStats = db.getContextTruncatedStats(today);
  const contextTruncated = contextStats?.context_truncated_count || 0;
  const savedTokens = contextStats?.saved_tokens || 0;
  
  // 获取隐私过滤计数
  const privacyFiltered = db.getPrivacyFilteredCount(today);
  
  return {
    date: today,
    totalRequests: totalRequests,
    successRequests: raw?.success_requests || 0,
    errorRequests: raw?.error_requests || 0,
    totalPromptTokens: raw?.total_prompt_tokens || 0,
    totalCompletionTokens: raw?.total_completion_tokens || 0,
    totalTokens: totalTokens,
    avgDuration: Math.round(raw?.avg_duration || 0),
    estimatedCost: calculateDayCost(raw),
    // 上下文裁切统计
    contextTruncated: contextTruncated,
    savedTokens: savedTokens,
    // 隐私过滤统计
    privacyFiltered: privacyFiltered,
    currentQPS: 0, // TODO: 实时计算
    // 7 天趋势数据（用于图表刷新）
    weekly: getLast7DaysStats()
  };
}

/**
 * 获取昨日统计
 */
export function getYesterdayStats(): any {
  if (!db) return createEmptyDailyStats();
  
  // 使用北京时间获取昨日日期（格式：YYYY-MM-DD）
  const now = new Date();
  now.setDate(now.getDate() - 1);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const yesterday = `${year}-${month}-${day}`;
  
  const raw: any = db.getDailyStats(yesterday);
  const cacheRaw: any = db.getDailyStats(yesterday); // TODO: 后续实现缓存统计
  
  const totalRequests = raw?.total_requests || 0;
  const totalTokens = raw?.total_tokens || 0;
  
  // 获取上下文裁切统计
  const contextStats = db.getContextTruncatedStats(yesterday);
  const contextTruncated = contextStats?.context_truncated_count || 0;
  const savedTokens = contextStats?.saved_tokens || 0;
  
  // 获取隐私过滤计数
  const privacyFiltered = db.getPrivacyFilteredCount(yesterday);
  
  return {
    date: yesterday,
    totalRequests: totalRequests,
    successRequests: raw?.success_requests || 0,
    errorRequests: raw?.error_requests || 0,
    totalPromptTokens: raw?.total_prompt_tokens || 0,
    totalCompletionTokens: raw?.total_completion_tokens || 0,
    totalTokens: totalTokens,
    avgDuration: Math.round(raw?.avg_duration || 0),
    estimatedCost: calculateDayCost(raw),
    // 上下文裁切统计
    contextTruncated: contextTruncated,
    savedTokens: savedTokens,
    // 隐私过滤统计
    privacyFiltered: privacyFiltered
  };
}

/**
 * 获取最近 N 条请求
 */
export function getRecentRequests(n: number = 100): RequestRecord[] {
  return db?.getRecentRequests(n) || [];
}

export function getRecentLogsSummary(n: number = 100): any[] {
  return db?.getRecentLogsSummary(n) || [];
}

/**
 * 获取单条日志详情
 */
export function getLogDetail(id: string): { requestBody: string | null; responseBody: string | null } | null {
  if (!db) return null;
  try {
    const stmt = (db as any).db.prepare('SELECT request_body as requestBody, response_body as responseBody FROM requests WHERE id = ?');
    const row = stmt.get(id);
    return row || null;
  } catch {
    return null;
  }
}

/**
 * 只获取请求体（更快的响应）
 */
export function getLogRequestBody(id: string): string | null {
  if (!db) return null;
  try {
    const stmt = (db as any).db.prepare('SELECT request_body FROM requests WHERE id = ?');
    const row = stmt.get(id);
    return row?.request_body || null;
  } catch {
    return null;
  }
}

/**
 * 只获取响应体
 */
export function getLogResponseBody(id: string): string | null {
  if (!db) return null;
  try {
    const stmt = (db as any).db.prepare('SELECT response_body FROM requests WHERE id = ?');
    const row = stmt.get(id);
    return row?.response_body || null;
  } catch {
    return null;
  }
}

/**
 * 获取总体统计
 */
export function getOverallStats(): any {
  if (!db) return createEmptyOverallStats();

  const raw: any = db.getOverallStats();
  const cacheRaw: any = db.getOverallCacheStats(); // 从数据库获取缓存统计
  
  const totalRequests = raw?.total_requests || 0;
  const cacheHits = cacheRaw?.cache_hits || 0;
  const actualRequests = totalRequests - cacheHits; // 实际请求数（不含缓存命中）
  const totalTokens = raw?.total_tokens || 0;
  const savedTokens = cacheRaw?.saved_tokens || 0;
  const actualTokens = totalTokens - savedTokens; // 实际消耗的 Token
  
  return {
    totalRequests: totalRequests,
    actualRequests: actualRequests, // 实际请求数（不含缓存命中）
    successRequests: raw?.success_requests || 0,
    errorRequests: (raw?.total_requests || 0) - (raw?.success_requests || 0),
    successRate: raw?.total_requests > 0 
      ? Math.round((raw?.success_requests / raw?.total_requests) * 100) 
      : 0,
    totalTokens: totalTokens,
    actualTokens: actualTokens, // 实际 Token 数（不含缓存节省）
    totalCost: calculateTotalCost(),
    uptime: process.uptime(),
    // 缓存相关 - 从数据库计算
    cacheHits: cacheHits,
    cacheHitRate: totalRequests > 0 ? Math.round((cacheHits / totalRequests) * 100) : 0,
    savedTokens: savedTokens,
    avgResponseTime: Math.round(raw?.avg_duration || 0)
  };
}

/**
 * 获取过去 7 天统计
 */
export function getLast7DaysStats(): any[] {
  return db?.getLast7DaysStats() || [];
}

/**
 * 从日志回放恢复数据
 */
export async function recoverFromLogs(days: number = 7): Promise<number> {
  if (!logBackup || !db) return 0;

  logger.info('[Stats] 开始从日志恢复数据', { days });
  
  const records = await logBackup.replay(days);
  const inserted = db.insertBatch(records);
  
  logger.info('[Stats] 日志恢复完成', { total: records.length, inserted });
  return inserted;
}

// 辅助函数
function createEmptyDailyStats() {
  return {
    date: new Date().toISOString().split('T')[0],
    totalRequests: 0,
    successRequests: 0,
    errorRequests: 0,
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    totalTokens: 0,
    avgDuration: 0,
    estimatedCost: 0
  };
}

function createEmptyOverallStats() {
  return {
    totalRequests: 0,
    successRequests: 0,
    errorRequests: 0,
    successRate: 0,
    totalTokens: 0,
    totalCost: 0,
    uptime: process.uptime()
  };
}

function calculateDayCost(raw: any): number {
  if (!raw) return 0;
  // 简化计算，实际应按模型分别计算
  const tokens = raw.total_tokens || 0;
  return Math.round((tokens / 1000) * 0.004 * 10000) / 10000;
}

function calculateTotalCost(): number {
  // TODO: 从数据库精确计算
  return 0;
}
