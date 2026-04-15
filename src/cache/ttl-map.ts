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
 * Savor - TTL Map
 * 带自动过期时间的内存 Map
 */

interface TTLEntry<V> {
  value: V;
  expireAt: number;
}

export class TTLMap<K, V> {
  private map = new Map<K, TTLEntry<V>>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private lastCleanupTime = 0;

  /**
   * 设置值，带过期时间
   */
  set(key: K, value: V, ttlMs: number): void {
    this.map.set(key, {
      value,
      expireAt: Date.now() + ttlMs
    });
  }

  /**
   * 获取值，自动清理过期项
   */
  get(key: K): V | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;

    // 检查是否过期
    if (Date.now() > entry.expireAt) {
      this.map.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * 检查是否存在（未过期）
   */
  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * 删除指定 key
   */
  delete(key: K): boolean {
    return this.map.delete(key);
  }

  /**
   * 清空所有数据
   */
  clear(): void {
    this.map.clear();
  }

  /**
   * 主动清理所有过期项
   */
  cleanup(): number {
    const now = Date.now();
    this.lastCleanupTime = now;
    let cleaned = 0;
    for (const [key, entry] of this.map) {
      if (now > entry.expireAt) {
        this.map.delete(key);
        cleaned++;
      }
    }
    return cleaned;
  }

  /**
   * 惰性清理：如果距离上次清理超过阈值，触发一次清理
   * @param thresholdMs 清理阈值（毫秒），默认 60 秒
   */
  private lazyCleanup(thresholdMs: number = 60000): void {
    const now = Date.now();
    if (now - this.lastCleanupTime > thresholdMs) {
      this.cleanup();
    }
  }

  /**
   * 获取当前大小（不包含过期项）
   */
  get size(): number {
    this.lazyCleanup();
    return this.map.size;
  }

  /**
   * 启动自动清理定时器
   * @param intervalMs 清理间隔（毫秒），默认 5 分钟
   */
  startAutoCleanup(intervalMs: number = 300000): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cleanupInterval = setInterval(() => {
      const cleaned = this.cleanup();
      if (cleaned > 0) {
        // 可以在这里添加日志，但不导入 logger 避免循环依赖
      }
    }, intervalMs);
  }

  /**
   * 停止自动清理定时器
   */
  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * 销毁：停止定时器并清空数据
   */
  destroy(): void {
    this.stopAutoCleanup();
    this.clear();
  }
}
