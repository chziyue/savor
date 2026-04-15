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
 * Savor - 异步写入队列
 * 收集请求记录，定时批量写入 SQLite，避免阻塞主线程
 */

import { logger } from '../utils/logger.js';
import type { RequestRecord } from './sqlite.js';

export interface WriteQueueConfig {
  /** 批量写入间隔（毫秒），默认 1000 */
  flushIntervalMs?: number;
  /** 队列最大长度，超过立即写入，默认 100 */
  maxQueueSize?: number;
  /** 写入回调函数 */
  onFlush: (records: RequestRecord[]) => number;
}

export class WriteQueue {
  private queue: RequestRecord[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private config: Required<WriteQueueConfig>;
  private isFlushing = false;

  constructor(config: WriteQueueConfig) {
    this.config = {
      flushIntervalMs: config.flushIntervalMs ?? 1000,
      maxQueueSize: config.maxQueueSize ?? 100,
      onFlush: config.onFlush,
    };

    logger.info('[WriteQueue] 异步写入队列已初始化', {
      flushIntervalMs: this.config.flushIntervalMs,
      maxQueueSize: this.config.maxQueueSize,
    });
  }

  /**
   * 入队请求记录（立即返回，不阻塞）
   */
  enqueue(record: RequestRecord): void {
    this.queue.push(record);

    // 队列超过上限（maxQueueSize 的 10 倍），丢弃最早的数据
    const maxQueueLimit = this.config.maxQueueSize * 10;
    if (this.queue.length > maxQueueLimit) {
      const dropped = this.queue.splice(0, this.queue.length - this.config.maxQueueSize);
      logger.warn('[WriteQueue] 队列超限，丢弃旧数据', { dropped: dropped.length, limit: maxQueueLimit });
    }

    // 队列超过阈值，立即触发写入
    if (this.queue.length >= this.config.maxQueueSize) {
      this.flush();
    }
  }

  /**
   * 启动定时写入
   */
  start(): void {
    if (this.flushInterval) {
      logger.warn('[WriteQueue] 定时写入已启动，跳过');
      return;
    }

    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.config.flushIntervalMs);

    logger.info('[WriteQueue] 定时写入已启动');
  }

  /**
   * 停止定时写入
   */
  stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
      logger.info('[WriteQueue] 定时写入已停止');
    }
  }

  /**
   * 手动写入（用于优雅关闭）
   */
  flush(): number {
    if (this.queue.length === 0) {
      return 0;
    }

    // 防止并发写入
    if (this.isFlushing) {
      logger.warn('[WriteQueue] 正在写入，跳过本次');
      return 0;
    }

    this.isFlushing = true;

    // 取出队列内容
    const records = this.queue.splice(0, this.queue.length);

    try {
      const count = this.config.onFlush(records);
      logger.debug('[WriteQueue] 批量写入完成', { count });
      this.isFlushing = false;
      return count;
    } catch (error) {
      // 写入失败，放回队列
      this.queue.unshift(...records);
      logger.error('[WriteQueue] 批量写入失败', { error, queueSize: this.queue.length });
      this.isFlushing = false;
      return 0;
    }
  }

  /**
   * 获取队列长度
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * 获取统计信息
   */
  getStats(): { queueLength: number; isFlushing: boolean } {
    return {
      queueLength: this.queue.length,
      isFlushing: this.isFlushing,
    };
  }
}