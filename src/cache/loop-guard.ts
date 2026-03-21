/**
 * Savor - Loop Guard
 * 检测并打断 OpenClaw 工具调用循环
 */

import { TTLMap } from './ttl-map.js';
import { logger } from '../utils/logger.js';
import type { ChatCompletionRequest, ChatCompletionResponse } from '../types/index.js';
import crypto from 'crypto';

export interface LoopGuardConfig {
  /** 第几次开始缓存（默认2） */
  cacheAfter?: number;
  /** 第几次熔断（默认4） */
  stopAfter?: number;
  /** 计数窗口时间（毫秒，默认60秒） */
  countWindow?: number;
  /** 缓存过期时间（毫秒，默认5分钟） */
  cacheTtl?: number;
}

export interface GuardResult {
  action: 'forward' | 'cache' | 'hit' | 'stop';
  response?: ChatCompletionResponse;
  count: number;
}

export class LoopGuard {
  private config: Required<LoopGuardConfig>;
  private counts: TTLMap<string, number>;
  private cache: TTLMap<string, ChatCompletionResponse>;

  constructor(config: LoopGuardConfig = {}) {
    this.config = {
      cacheAfter: config.cacheAfter ?? 2,
      stopAfter: config.stopAfter ?? 4,
      countWindow: config.countWindow ?? 60000,
      cacheTtl: config.cacheTtl ?? 300000
    };

    this.counts = new TTLMap<string, number>();
    this.cache = new TTLMap<string, ChatCompletionResponse>();

    logger.info('[LoopGuard] 初始化完成', this.config);
  }

  /**
   * 检查请求是否为循环
   * @returns GuardResult 处理结果
   */
  check(reqBody: ChatCompletionRequest): GuardResult {
    const key = this.hashRequest(reqBody);
    const count = (this.counts.get(key) || 0) + 1;

    // 记录次数
    this.counts.set(key, count, this.config.countWindow);

    // 第1次：正常转发
    if (count === 1) {
      return { action: 'forward', count };
    }

    // 第2次：转发并缓存
    if (count === this.config.cacheAfter) {
      return { action: 'cache', count };
    }

    // 第3次：读缓存
    if (count < this.config.stopAfter) {
      const cached = this.cache.get(key);
      if (cached) {
        logger.warn(`[LoopGuard] 检测到循环: ${key.slice(0, 8)}... (${count}/${this.config.stopAfter})`);
        return { action: 'hit', response: cached, count };
      }
      // 缓存失效，重新转发
      return { action: 'forward', count };
    }

    // 第4次：熔断
    logger.error(`[LoopGuard] 循环熔断: ${key.slice(0, 8)}...`);
    return { action: 'stop', response: this.createStopResponse(), count };
  }

  /**
   * 缓存响应结果
   */
  cacheResponse(reqBody: ChatCompletionRequest, response: ChatCompletionResponse): void {
    const key = this.hashRequest(reqBody);
    this.cache.set(key, response, this.config.cacheTtl);
    logger.debug(`[LoopGuard] 缓存响应: ${key.slice(0, 8)}...`);
  }

  /**
   * 生成请求指纹
   */
  private hashRequest(body: ChatCompletionRequest): string {
    // 提取关键字段生成指纹
    const data = {
      model: body.model,
      messages: body.messages?.map((m) => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content.slice(0, 200) : m.content
      })),
      tools: body.tools?.map((t) => t.function?.name).sort()
    };

    return crypto
      .createHash('md5')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  /**
   * 创建熔断响应
   */
  private createStopResponse(): ChatCompletionResponse {
    return {
      id: `loop-guard-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'loop-guard',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: '[SYSTEM] 检测到工具调用循环，已自动停止。请检查配置或稍后重试。'
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
    };
  }

  /**
   * 获取统计信息
   */
  getStats(): { 
    totalRequests: number;
    cacheHits: number;
    cacheHitRate: number;
    savedTokens: number;
    avgResponseTime: number;
  } {
    // 简化统计：直接从缓存大小估算
    const cacheHits = this.cache.size; // 有多少个缓存键
    const totalRequests = this.counts.size + cacheHits; // 粗略估算
    
    // 估算节省的 token（假设每次命中节省平均100 token）
    const savedTokens = cacheHits * 100;
    
    // 缓存命中率
    const cacheHitRate = totalRequests > 0 
      ? Math.round((cacheHits / totalRequests) * 100) 
      : 0;
    
    return {
      totalRequests,
      cacheHits,
      cacheHitRate,
      savedTokens,
      avgResponseTime: 0
    };
  }
}
