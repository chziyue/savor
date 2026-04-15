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
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WriteQueue } from './write-queue.js';
import type { RequestRecord } from './sqlite.js';

// Mock 写入回调
const mockFlush = vi.fn((records: RequestRecord[]) => records.length);

describe('WriteQueue', () => {
  let queue: WriteQueue;

  beforeEach(() => {
    mockFlush.mockClear();
    queue = new WriteQueue({
      flushIntervalMs: 1000,
      maxQueueSize: 10,
      onFlush: mockFlush,
    });
  });

  afterEach(() => {
    queue.stop();
  });

  describe('enqueue', () => {
    it('入队后立即返回，不阻塞', () => {
      const record = createMockRecord('test-1');
      queue.enqueue(record);
      expect(queue.getQueueLength()).toBe(1);
    });

    it('队列超过阈值时立即触发写入', () => {
      for (let i = 0; i < 10; i++) {
        queue.enqueue(createMockRecord(`test-${i}`));
      }
      expect(mockFlush).toHaveBeenCalledTimes(1);
      expect(mockFlush).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ id: 'test-0' }),
        expect.objectContaining({ id: 'test-9' }),
      ]));
    });

    it('队列未达阈值时不触发写入', () => {
      for (let i = 0; i < 5; i++) {
        queue.enqueue(createMockRecord(`test-${i}`));
      }
      expect(mockFlush).not.toHaveBeenCalled();
    });
  });

  describe('flush', () => {
    it('手动写入清空队列', () => {
      queue.enqueue(createMockRecord('test-1'));
      queue.enqueue(createMockRecord('test-2'));
      const count = queue.flush();
      expect(count).toBe(2);
      expect(queue.getQueueLength()).toBe(0);
    });

    it('队列空时不触发写入', () => {
      const count = queue.flush();
      expect(count).toBe(0);
      expect(mockFlush).not.toHaveBeenCalled();
    });

    it('写入失败时放回队列', () => {
      mockFlush.mockImplementationOnce(() => {
        throw new Error('写入失败');
      });
      queue.enqueue(createMockRecord('test-1'));
      const count = queue.flush();
      expect(count).toBe(0);
      expect(queue.getQueueLength()).toBe(1); // 放回队列
    });

    it('并发写入时跳过（防止重复写入）', () => {
      mockFlush.mockImplementationOnce(() => {
        // 模拟慢写入
        return 1;
      });
      
      queue.enqueue(createMockRecord('test-1'));
      
      // 手动触发两次（模拟并发）
      queue.flush();
      queue.flush();
      
      // 只有第一次写入成功
      expect(mockFlush).toHaveBeenCalledTimes(1);
    });
  });

  describe('定时写入', () => {
    it('启动定时写入', () => {
      queue.start();
      expect(queue.getStats().isFlushing).toBe(false);
    });

    it('停止定时写入', () => {
      queue.start();
      queue.stop();
      // 定时器已清除
    });

    it('重复启动跳过', () => {
      queue.start();
      queue.start(); // 应跳过
      // 只有一个定时器
    });
  });

  describe('并发入队（多小弟场景）', () => {
    it('并发入队正常工作', () => {
      // 模拟 10 个小弟同时入队
      const records: RequestRecord[] = [];
      for (let i = 0; i < 20; i++) {
        records.push(createMockRecord(`concurrent-${i}`));
      }
      
      // 一次性入队
      for (const record of records) {
        queue.enqueue(record);
      }
      
      // 应触发两次写入（阈值 10）
      expect(mockFlush).toHaveBeenCalledTimes(2);
    });
  });

  describe('优雅关闭', () => {
    it('stop 后手动 flush 写入剩余数据', () => {
      queue.enqueue(createMockRecord('test-1'));
      queue.stop();
      const count = queue.flush();
      expect(count).toBe(1);
    });
  });
});

// 辅助函数
function createMockRecord(id: string): RequestRecord {
  return {
    id,
    timestamp: Date.now(),
    model: 'test-model',
    promptTokens: 100,
    completionTokens: 50,
    totalTokens: 150,
    duration: 500,
    status: 'success',
  };
}