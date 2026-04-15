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
 * Savor - Loop Guard
 * 检测并打断 OpenClaw 工具调用循环
 */

import { TTLMap } from './ttl-map.js';
import { logger } from '../utils/logger.js';
import type { ChatCompletionRequest, ChatCompletionResponse } from '../types/index.js';
import crypto from 'crypto';

export interface LoopGuardConfig {
  /** 第几次熔断（默认3） */
  stopAfter?: number;
  /** 计数窗口时间（毫秒，默认60秒） */
  countWindow?: number;
}

export interface GuardResult {
  action: 'forward' | 'stop';
  count: number;
}

export class LoopGuard {
  private config: Required<LoopGuardConfig>;
  private counts: TTLMap<string, number>;

  constructor(config: LoopGuardConfig = {}) {
    this.config = {
      stopAfter: config.stopAfter ?? 3,
      countWindow: config.countWindow ?? 60000
    };

    this.counts = new TTLMap<string, number>();

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

    // 未达到熔断阈值，正常转发
    if (count < this.config.stopAfter) {
      return { action: 'forward', count };
    }

    // 达到阈值，熔断
    logger.error(`[LoopGuard] 循环熔断: ${key.slice(0, 8)}...`);
    return { action: 'stop', count };
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
  createStopResponse(): ChatCompletionResponse {
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
    avgResponseTime: number;
  } {
    const totalRequests = this.counts.size;

    return {
      totalRequests,
      avgResponseTime: 0
    };
  }
}
