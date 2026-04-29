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
 * Savor - 多用户限流控制模块
 * 基于客户端 IP 独立计数和锁定
 */

import { logger } from '../utils/logger.js';
import type { Request } from 'express';

export interface RateLimiterConfig {
  requestsPerMinute: number;  // 每分钟最大请求数
  windowMs?: number;          // 时间窗口（毫秒），默认 60000
  permanentLock?: boolean | number;  // true=永久锁定，false=不锁定，数字=锁定 N 分钟后自动解锁
}

export interface UserRateLimitState {
  requests: number[];         // 请求时间戳列表
  isLocked: boolean;          // 是否被锁定
  lockTime?: number;          // 锁定时间戳
  autoUnlockAt?: number;      // 自动解锁时间戳（如果配置了锁定时间）
  lastActivity?: number;      // 最后活动时间（用于清理闲置用户）
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;          // 剩余请求数
  resetTime: number;          // 重置时间戳（毫秒）
  retryAfter?: number;        // 需要等待的秒数（距离自动解锁）
  locked?: boolean;           // 是否处于锁定状态
  lockedDuration?: number;    // 已锁定时长（秒）
  clientId: string;           // 客户端 ID
  autoUnlockAt?: string;      // 自动解锁时间（如果配置了定时解锁）
}

export interface ClientStatus {
  clientId: string;
  allowed: boolean;
  remaining: number;
  locked: boolean;
  lockTime?: string;
  autoUnlockAt?: string;
  requestCount: number;
  exists?: boolean;
  message?: string;
  resetTime?: string;
}

export interface LockedClientInfo {
  clientId: string;
  lockTime: string;
  lockedDuration: number;
  autoUnlockAt?: string;
  autoUnlockIn?: number;
}

export class RateLimiter {
  private config: RateLimiterConfig;
  private windowMs: number;
  private users: Map<string, UserRateLimitState> = new Map();  // 按用户独立计数
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  
  /** 闲置用户超时时间（毫秒），默认 30 分钟 */
  private idleTimeoutMs: number;

  constructor(config: RateLimiterConfig) {
    this.config = config;
    this.windowMs = config.windowMs || 60000;  // 默认 1 分钟
    this.idleTimeoutMs = 30 * 60 * 1000;  // 30 分钟
    
    logger.info('[RateLimiter] 多用户限流器已初始化', {
      requestsPerMinute: this.config.requestsPerMinute,
      windowMs: this.windowMs,
      permanentLock: this.config.permanentLock !== false
    });
  }

  /**
   * 从请求中提取客户端 ID
   * 优先级：X-Forwarded-For > X-Real-IP > remoteAddress
   */
  getClientId(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'] as string | undefined;
    const realIp = req.headers['x-real-ip'] as string | undefined;
    const remoteAddr = req.headers['x-remote-addr'] as string | undefined || req.ip || req.socket?.remoteAddress || 'unknown';
    
    // X-Forwarded-For 可能包含多个 IP，取第一个
    if (forwarded) {
      const ips = forwarded.split(',').map((ip) => ip.trim());
      return ips[0] || remoteAddr;
    }
    
    if (realIp) {
      return realIp;
    }
    
    return remoteAddr;
  }

  /**
   * 获取或创建用户状态
   */
  private getUserState(clientId: string): UserRateLimitState {
    if (!this.users.has(clientId)) {
      this.users.set(clientId, {
        requests: [],
        isLocked: false,
        lastActivity: Date.now()
      });
    }
    const state = this.users.get(clientId)!;
    state.lastActivity = Date.now();  // 更新最后活动时间
    return state;
  }

  /**
   * 清理用户过期请求
   */
  private cleanupUserState(state: UserRateLimitState): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    state.requests = state.requests.filter(timestamp => timestamp > windowStart);
  }

  /**
   * 检查是否允许请求（针对特定客户端）
   */
  check(req: Request): RateLimitResult {
    const clientId = this.getClientId(req);
    const state = this.getUserState(clientId);
    const now = Date.now();

    // 如果已锁定，检查是否需要拒绝或自动解锁
    if (state.isLocked) {
      // 检查是否配置了自动解锁时间
      if (state.autoUnlockAt && now >= state.autoUnlockAt) {
        // 自动解锁（先保存锁定时长再清除）
        const lockDuration = state.lockTime ? ((now - state.lockTime) / 1000).toFixed(0) : '0';
        state.isLocked = false;
        state.requests = [];
        state.lockTime = undefined;
        state.autoUnlockAt = undefined;
        logger.warn('[RateLimiter] 客户端自动解锁', {
          clientId,
          lockedDuration: `${lockDuration}秒`
        });
      } else {
        // 仍在锁定中
        const lockedDuration = state.lockTime ? Math.ceil((now - state.lockTime) / 1000) : undefined;
        const retryAfter = state.autoUnlockAt ? Math.ceil((state.autoUnlockAt - now) / 1000) : undefined;

        logger.warn('[RateLimiter] 客户端锁定中，拒绝请求', {
          clientId,
          lockedSince: state.lockTime ? new Date(state.lockTime).toISOString() : 'unknown',
          lockedDuration: lockedDuration ? `${lockedDuration}秒` : 'unknown',
          retryAfter: retryAfter ? `${retryAfter}秒` : '需手动重置'
        });

        return {
          allowed: false,
          remaining: 0,
          resetTime: 0,
          retryAfter,
          lockedDuration,
          locked: true,
          clientId,
          autoUnlockAt: state.autoUnlockAt ? new Date(state.autoUnlockAt).toISOString() : undefined
        };
      }
    }

    // 清理过期请求
    this.cleanupUserState(state);

    const currentCount = state.requests.length;
    const remaining = Math.max(0, this.config.requestsPerMinute - currentCount);

    // 计算重置时间（窗口结束时间）
    const oldestRequest = state.requests[0] || now;
    const resetTime = oldestRequest + this.windowMs;

    if (currentCount >= this.config.requestsPerMinute) {
      // 超出限制
      const retryAfter = Math.ceil((resetTime - now) / 1000);
      
      logger.warn('[RateLimiter] 客户端限流触发', {
        clientId,
        currentCount,
        limit: this.config.requestsPerMinute,
        retryAfter,
        permanentLock: this.config.permanentLock !== false
      });

      // 如果启用锁定模式
      if (this.config.permanentLock !== false) {
        state.isLocked = true;
        state.lockTime = now;
        
        // 判断是永久锁定还是定时锁定
        if (typeof this.config.permanentLock === 'number' && this.config.permanentLock > 0) {
          // 定时锁定：计算自动解锁时间
          state.autoUnlockAt = now + (this.config.permanentLock * 60 * 1000);  // 分钟转毫秒
          logger.error('[RateLimiter] !!! 客户端定时锁定已激活 !!!', {
            clientId,
            lockedAt: new Date(state.lockTime).toISOString(),
            autoUnlockAt: new Date(state.autoUnlockAt).toISOString(),
            lockDurationMinutes: this.config.permanentLock,
            reason: '达到限流阈值'
          });
        } else {
          // 永久锁定
          logger.error('[RateLimiter] !!! 客户端永久锁定已激活 !!!', {
            clientId,
            lockedAt: new Date(state.lockTime).toISOString(),
            reason: '达到限流阈值'
          });
        }
      }

      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter,
        locked: this.config.permanentLock !== false,
        clientId
      };
    }

    // 允许请求，记录时间戳
    state.requests.push(now);

    logger.debug('[RateLimiter] 客户端请求通过', {
      clientId,
      currentCount: currentCount + 1,
      limit: this.config.requestsPerMinute,
      remaining: remaining - 1
    });

    return {
      allowed: true,
      remaining: remaining - 1,
      resetTime,
      locked: false,
      clientId
    };
  }

  /**
   * 获取所有客户端状态
   */
  getAllStatus(): Array<{
    clientId: string;
    allowed: boolean;
    remaining: number;
    locked: boolean;
    lockTime?: string;
    autoUnlockAt?: string;
    requestCount: number;
  }> {
    const statuses: ClientStatus[] = [];

    for (const [clientId, state] of this.users.entries()) {
      // 清理过期请求
      this.cleanupUserState(state);
      
      statuses.push({
        clientId,
        allowed: !state.isLocked && state.requests.length < this.config.requestsPerMinute,
        remaining: Math.max(0, this.config.requestsPerMinute - state.requests.length),
        locked: state.isLocked,
        lockTime: state.lockTime ? new Date(state.lockTime).toISOString() : undefined,
        autoUnlockAt: state.autoUnlockAt ? new Date(state.autoUnlockAt).toISOString() : undefined,
        requestCount: state.requests.length
      });
    }

    return statuses;
  }

  /**
   * 获取特定客户端状态
   */
  getClientStatus(clientId: string): ClientStatus {
    const state = this.users.get(clientId);
    if (!state) {
      return {
        clientId,
        exists: false,
        message: '该客户端无请求记录',
        allowed: false,
        remaining: 0,
        locked: false,
        requestCount: 0
      };
    }

    const now = Date.now();
    this.cleanupUserState(state);
    
    const oldestRequest = state.requests[0] || now;
    const resetTime = oldestRequest + this.windowMs;

    return {
      clientId,
      exists: true,
      allowed: !state.isLocked && state.requests.length < this.config.requestsPerMinute,
      remaining: Math.max(0, this.config.requestsPerMinute - state.requests.length),
      locked: state.isLocked,
      lockTime: state.lockTime ? new Date(state.lockTime).toISOString() : undefined,
      autoUnlockAt: state.autoUnlockAt ? new Date(state.autoUnlockAt).toISOString() : undefined,
      requestCount: state.requests.length,
      resetTime: new Date(resetTime).toISOString()
    };
  }

  /**
   * 解锁特定客户端
   */
  unlock(clientId?: string): { success: boolean; message: string; unlockedCount?: number } {
    if (!clientId) {
      // 解锁所有客户端
      let unlockedCount = 0;
      for (const [id, state] of this.users.entries()) {
        if (state.isLocked) {
          const lockDuration = state.lockTime ? ((Date.now() - state.lockTime) / 1000).toFixed(1) : '0';
          state.isLocked = false;
          state.requests = [];
          state.lockTime = undefined;
          state.autoUnlockAt = undefined;
          logger.warn('[RateLimiter] 客户端永久锁定已手动解除', {
            clientId: id,
            lockedDuration: `${lockDuration}秒`
          });
          unlockedCount++;
        }
      }
      
      if (unlockedCount > 0) {
        logger.warn('[RateLimiter] !!! 所有客户端锁定已解除 !!!', {
          unlockedCount
        });
        return { 
          success: true, 
          message: `已解锁 ${unlockedCount} 个客户端`,
          unlockedCount 
        };
      } else {
        return { 
          success: false, 
          message: '没有客户端处于锁定状态' 
        };
      }
    }

    // 解锁特定客户端
    const state = this.users.get(clientId);
    if (!state) {
      return { success: false, message: `客户端 ${clientId} 不存在` };
    }

    if (!state.isLocked) {
      return { success: false, message: `客户端 ${clientId} 未处于锁定状态` };
    }

    const lockDuration = state.lockTime ? ((Date.now() - state.lockTime) / 1000).toFixed(1) : '0';
    state.isLocked = false;
    state.requests = [];
    state.lockTime = undefined;
    state.autoUnlockAt = undefined;
    
    logger.warn('[RateLimiter] !!! 客户端永久锁定已手动解除 !!!', {
      clientId,
      lockedDuration: `${lockDuration}秒`
    });

    return { success: true, message: `客户端 ${clientId} 限流已解除` };
  }

  /**
   * 获取锁定中的客户端列表
   */
  getLockedClients(): Array<{
    clientId: string;
    lockTime: string;
    lockedDuration: number;
    autoUnlockAt?: string;
    autoUnlockIn?: number;
  }> {
    const now = Date.now();
    const locked: LockedClientInfo[] = [];

    for (const [clientId, state] of this.users.entries()) {
      if (state.isLocked && state.lockTime) {
        const info: LockedClientInfo = {
          clientId,
          lockTime: new Date(state.lockTime).toISOString(),
          lockedDuration: Math.floor((now - state.lockTime) / 1000)
        };
        
        if (state.autoUnlockAt) {
          info.autoUnlockAt = new Date(state.autoUnlockAt).toISOString();
          info.autoUnlockIn = Math.max(0, Math.floor((state.autoUnlockAt - now) / 1000));
        }
        
        locked.push(info);
      }
    }

    return locked;
  }

  /**
   * 重置计数器（不清除锁定状态）
   */
  reset(clientId?: string): void {
    if (!clientId) {
      // 重置所有客户端
      for (const state of this.users.values()) {
        state.requests = [];
      }
      logger.info('[RateLimiter] 所有客户端计数器已重置');
    } else {
      // 重置特定客户端
      const state = this.users.get(clientId);
      if (state) {
        state.requests = [];
        logger.info('[RateLimiter] 客户端计数器已重置', { clientId });
      }
    }
  }

  /**
   * 清理闲置用户（超过 idleTimeoutMs 未活动且未锁定）
   * @returns 清理的用户数量
   */
  cleanupIdleUsers(): number {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [clientId, state] of this.users.entries()) {
      // 不清理锁定中的用户
      if (state.isLocked) continue;
      
      // 检查是否闲置超时
      const lastActivity = state.lastActivity || 0;
      if (now - lastActivity > this.idleTimeoutMs) {
        this.users.delete(clientId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.info('[RateLimiter] 清理闲置用户', { cleaned, remaining: this.users.size });
    }
    
    return cleaned;
  }

  /**
   * 启动自动清理定时器
   * @param intervalMs 清理间隔（毫秒），默认 10 分钟
   */
  startAutoCleanup(intervalMs: number = 600000): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleUsers();
    }, intervalMs);
    
    logger.info('[RateLimiter] 自动清理已启动', { intervalMs });
  }

  /**
   * 停止自动清理定时器
   */
  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.info('[RateLimiter] 自动清理已停止');
    }
  }

  /**
   * 获取用户统计信息
   */
  getStats(): { totalUsers: number; lockedUsers: number; activeUsers: number } {
    const now = Date.now();
    let lockedUsers = 0;
    let activeUsers = 0;

    for (const state of this.users.values()) {
      if (state.isLocked) {
        lockedUsers++;
      } else if (state.lastActivity && now - state.lastActivity < this.windowMs) {
        activeUsers++;
      }
    }

    return {
      totalUsers: this.users.size,
      lockedUsers,
      activeUsers
    };
  }

  /**
   * 更新配置（热更新）
   */
  updateConfig(config: Partial<RateLimiterConfig>): void {
    if (config.requestsPerMinute !== undefined) {
      this.config.requestsPerMinute = config.requestsPerMinute;
    }
    if (config.windowMs !== undefined) {
      this.config.windowMs = config.windowMs;
      this.windowMs = config.windowMs;
    }
    if (config.permanentLock !== undefined) {
      this.config.permanentLock = config.permanentLock;
    }
    logger.info('[RateLimiter] 配置已更新', {
      requestsPerMinute: this.config.requestsPerMinute,
      windowMs: this.windowMs,
      permanentLock: this.config.permanentLock
    });
  }
}
