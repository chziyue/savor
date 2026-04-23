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
 * Savor - 核心代理转发模块
 * 复用并优化自 ~/.openclaw/proxy/proxy-debug.js
 */

import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { logger } from '../utils/logger.js';
import { recordRequest, initStats } from '../utils/stats.js';
import { LoopGuard } from '../cache/index.js';
import { TraceLogger, traceStep, setTraceLogger } from '../utils/trace-logger.js';
import { RateLimiter, type ClientStatus, type LockedClientInfo } from '../utils/rate-limiter.js';
import { filterObject, filterText, getFilterMarkers, updateFilterConfig, type FilterObjectResult } from '../utils/filter.js';
import { BadGatewayError } from '../utils/errors.js';
import { createDependencies } from './factory.js';
import { detectCommand } from './commands.js';
import type { SavorConfig } from '../config/index.js';
import type { ProxyDependencies, ILogger } from './types.js';
import type { ChatCompletionRequest, ChatCompletionResponse, ChatMessage } from '../types/index.js';
import type { AnthropicMessagesRequest, AnthropicMessagesResponse, AnthropicMessage, AnthropicContent } from '../types/index.js';

// 初始化统计模块
initStats();

/**
 * Token 估算用的字符正则常量
 */
const CHAR_PATTERNS = {
  chinese: /[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/g,
  english: /[a-zA-Z]/g,
  digit: /[0-9]/g,
  jsonStruct: /[{}[\]:"',\\]/g,
};

export class ProxyServer {
  private config: SavorConfig;
  private logger: ILogger;
  private loopGuard?: LoopGuard;
  private traceLogger?: TraceLogger;
  private rateLimiter?: RateLimiter;

  /**
   * 构造函数
   * @param config - 配置
   * @param deps - 可选依赖注入（用于测试）
   */
  constructor(config: SavorConfig, deps?: Partial<ProxyDependencies>) {
    this.config = config;
    
    // 使用注入的依赖或创建默认依赖
    const defaultDeps = createDependencies(config);
    const finalDeps = { ...defaultDeps, ...deps };
    
    this.logger = finalDeps.logger;
    
    // 初始化循环保护（兼容新旧配置格式）
    const loopGuardEnabled = config.loopGuard?.enabled ?? (config.features?.loopGuard !== false);
    if (loopGuardEnabled) {
      // 如果注入了 loopGuard，使用注入的
      if (finalDeps.loopGuard) {
        this.loopGuard = finalDeps.loopGuard as unknown as LoopGuard;
      }
      const lgConfig = config.loopGuard || config.loopGuardConfig || {};
      this.logger.info('[Proxy] 循环保护已启用', lgConfig);
    }

    // 初始化限流器（兼容新旧配置格式）
    const rateLimitEnabled = config.rateLimit?.enabled ?? (config.features?.rateLimit !== false);
    const rlConfig = config.rateLimit || config.rateLimitConfig;
    if (rateLimitEnabled && rlConfig) {
      if (finalDeps.rateLimiter) {
        this.rateLimiter = finalDeps.rateLimiter as unknown as RateLimiter;
      }
      this.logger.info('[Proxy] 限流器已启用', rlConfig);
    }

    // 初始化全链路追踪
    if (config.fullTrace?.enabled) {
      if (finalDeps.traceLogger) {
        this.traceLogger = finalDeps.traceLogger as unknown as TraceLogger;
        setTraceLogger(this.traceLogger);
      }
    }

    // 初始化内容过滤
    if (config.contentFilter?.enabled) {
      this.logger.info('[Proxy] 内容过滤已启用', {
        categories: config.contentFilter.categories,
        replacements: config.contentFilter.replacements
      });
    } else {
      this.logger.info('[Proxy] 内容过滤已禁用');
    }
  }

  /**
   * 处理请求转发
   */
  async handleRequest(req: ExpressRequest, res: ExpressResponse): Promise<void> {
    const requestId = Math.random().toString(36).substring(2, 8);
    const startTime = Date.now();
    let body = req.body;
    let filterMarkers: string[] | undefined;
    let contextTruncated = false;

    try {
      let messages = body.messages || [];
      const originalTools = body.tools || [];
      const stream = body.stream === true;

      // ========== 内容过滤（输入） ==========
      if (this.config.contentFilter?.enabled) {
        const originalBodyStr = JSON.stringify(body);
        const filterResult: FilterObjectResult = filterObject(body, this.config.contentFilter);
        body = filterResult.data;
        const newBodyStr = JSON.stringify(body);
        
        if (originalBodyStr !== newBodyStr && filterResult.categories.length > 0) {
          logger.info(`[${requestId}] 输入内容已过滤`);
          filterMarkers = getFilterMarkers(filterResult.categories);
        }
      }

      // ========== 命令检测（可能触发上下文截断） ==========
      let savedTokens = 0;
      let commandTruncated = false;
      if (this.config.commands?.enabled) {
        const commandResult = detectCommand(messages, this.config.commands);
        if (commandResult.detected && commandResult.shouldTruncateContext) {
          const truncateResult = this.truncateContext(messages, commandResult.maxRounds || 0);
          messages = truncateResult.messages;
          commandTruncated = true;
          contextTruncated = true;
          savedTokens = truncateResult.savedTokens;
          body.messages = messages;
          
          if (!filterMarkers) filterMarkers = [];
          filterMarkers.push(`Context ${commandResult.maxRounds || 0}`);
          
          logger.info(`[${requestId}] 命令触发上下文截断`, {
            command: commandResult.command,
            maxRounds: commandResult.maxRounds,
            savedTokens
          });
        }
      }

      // ========== 上下文截断（节省 Token） ==========
      // 如果命令已触发截断，跳过常规截断
      if (!commandTruncated && this.config.contextTruncation?.enabled && this.config.contextTruncation.maxRounds > 0) {
        const truncateResult = this.truncateContext(messages, this.config.contextTruncation.maxRounds);
        messages = truncateResult.messages;
        contextTruncated = truncateResult.truncated;
        savedTokens = truncateResult.savedTokens;
        body.messages = messages;
        
        // 添加上下文裁切标记
        if (contextTruncated) {
          if (!filterMarkers) filterMarkers = [];
          filterMarkers.push(`Context ${this.config.contextTruncation.maxRounds}`);
        }
      }

      // ========== 步骤1: 记录从 OpenClaw 接收的请求 ==========
      if (this.traceLogger) {
        traceStep(requestId, {
          step: 1,
          direction: 'in',
          source: 'openclaw',
          timestamp: Date.now(),
          data: {
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: body
          }
        });
      }

      // 模型替换
      const originalModel = body.model;
      if (this.config.modelOverride?.enabled) {
        body.model = this.config.modelOverride.model;
        logger.info(`[${requestId}] 模型替换: ${originalModel} → ${body.model}`);
      }

      // API Key 替换
      let authorization = req.headers.authorization || '';
      if (this.config.apiKeyOverride?.enabled && this.config.apiKeyOverride.apiKey) {
        authorization = `Bearer ${this.config.apiKeyOverride.apiKey}`;
        logger.info(`[${requestId}] API Key 替换`);
      }

      // 记录请求信息
      logger.info(`[${requestId}] 新请求`, {
        model: body.model,
        messageCount: messages.length,
        toolCount: originalTools.length,
        stream,
        contentLength: JSON.stringify(body).length
      });

      // 限流检查（在循环保护之前）
      if (this.rateLimiter) {
        const rateLimitResult = this.rateLimiter.check(req);
        
        if (!rateLimitResult.allowed) {
          // 超出限流，直接返回错误
          logger.warn(`[${requestId}] 限流触发`, {
            limit: this.config.rateLimitConfig?.requestsPerMinute,
            retryAfter: rateLimitResult.retryAfter,
            resetTime: new Date(rateLimitResult.resetTime).toISOString()
          });
          
          const rateLimitResponse = {
            error: 'Rate Limit Exceeded',
            message: `请求过于频繁，已达到每分钟 ${this.config.rateLimitConfig?.requestsPerMinute} 次的限制`,
            retryAfter: rateLimitResult.retryAfter,
            resetTime: new Date(rateLimitResult.resetTime).toISOString()
          };
          
          // 记录限流响应
          if (this.traceLogger) {
            traceStep(requestId, {
              step: 4,
              direction: 'out',
              source: 'openclaw',
              timestamp: Date.now(),
              data: rateLimitResponse
            });
          }
          
          // 记录限流统计
          recordRequest({
            id: requestId,
            timestamp: Date.now(),
            model: body.model || 'unknown',
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            duration: 0,
            status: 'rate_limited',
            requestBody: JSON.stringify(body, null, 2),
            responseBody: JSON.stringify(rateLimitResponse, null, 2),
            errorMessage: 'Rate limit exceeded',
            filterMarkers
          });
          
          res.status(429).json(rateLimitResponse);
          return;
        }
        
        logger.debug(`[${requestId}] 限流检查通过`, {
          remaining: rateLimitResult.remaining,
          resetTime: new Date(rateLimitResult.resetTime).toISOString()
        });
      }

      // 循环保护检查
      if (this.loopGuard) {
        const guardResult = this.loopGuard.check(body);

        if (guardResult.action === 'stop') {
          // 熔断，直接返回停止响应
          logger.warn(`[${requestId}] 循环熔断触发 (${guardResult.count}次)`);

          const stopResponse = this.loopGuard.createStopResponse();

          // 记录熔断响应
          if (this.traceLogger) {
            traceStep(requestId, {
              step: 4,
              direction: 'out',
              source: 'openclaw',
              timestamp: Date.now(),
              data: stopResponse
            });
          }

          res.json(stopResponse);
          return;
        }
      }

      // 构建转发请求
      const suffix = this.config.upstreamSuffix || '/v1/chat/completions';
      const targetUrl = `${this.config.upstream}${suffix}`;
      
      logger.debug(`[${requestId}] 转发到: ${targetUrl}`);

      // ========== 步骤2: 记录转发给大模型的请求 ==========
      if (this.traceLogger) {
        traceStep(requestId, {
          step: 2,
          direction: 'out',
          source: 'upstream',
          timestamp: Date.now(),
          data: {
            url: targetUrl,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authorization,
              'Accept': stream ? 'text/event-stream' : 'application/json'
            },
            body: body
          }
        });
      }

      // 流式请求时添加 stream_options 以获取 token 统计
      if (stream) {
        body.stream_options = { include_usage: true };
      }

      // 发送请求到上游（带超时）
      const controller = new AbortController();
      const timeoutMs = this.config.timeout?.upstream || 60000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const upstreamRes = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authorization,
          'Accept': stream ? 'text/event-stream' : 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;

      // 记录响应信息
      logger.info(`[${requestId}] 上游响应`, {
        status: upstreamRes.status,
        duration: `${duration}ms`,
        contentType: upstreamRes.headers.get('content-type')
      });

      // 处理响应
      if (stream) {
        await this.handleStreamResponse(requestId, upstreamRes, res, body, startTime, filterMarkers, contextTruncated, savedTokens);
      } else {
        await this.handleNormalResponse(requestId, upstreamRes, res, body, startTime, filterMarkers, contextTruncated, savedTokens);
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // 详细错误日志
      const errorDetails: Record<string, unknown> = {
        errorMessage: error instanceof Error ? error.message : String(error),
        duration: `${duration}ms`,
      };
      
      // 添加错误类型
      if (error instanceof Error) {
        errorDetails.errorName = error.name;
        errorDetails.errorStack = error.stack;
        
        // 添加 cause（fetch 失败的真正原因）
        const cause = (error as { cause?: unknown }).cause;
        if (cause) {
          errorDetails.cause = cause;
          if (cause instanceof Error) {
            errorDetails.causeMessage = cause.message;
            errorDetails.causeCode = (cause as { code?: string }).code;
          }
        }
        
        // 添加系统错误码
        const sysError = error as { code?: string; errno?: number };
        if (sysError.code) {
          errorDetails.errorCode = sysError.code;
        }
        if (sysError.errno) {
          errorDetails.errorNo = sysError.errno;
        }
      }
      
      logger.error(`[${requestId}] 请求失败`, errorDetails);

      const errorResponse = {
        error: '代理请求失败',
        message: error instanceof Error ? error.message : '未知错误',
        details: errorDetails
      };

      // 记录错误统计
      recordRequest({
        id: requestId,
        timestamp: Date.now(),
        model: body?.model || 'unknown',
        promptTokens: Math.ceil(JSON.stringify(body?.messages || {}).length / 4),
        completionTokens: 0,
        totalTokens: Math.ceil(JSON.stringify(body?.messages || {}).length / 4),
        duration: duration,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : '未知错误',
        requestBody: JSON.stringify(body, null, 2),
        responseBody: JSON.stringify(errorResponse, null, 2)
      });

      // 记录错误响应
      if (this.traceLogger) {
        traceStep(requestId, {
          step: 4,
          direction: 'out',
          source: 'openclaw',
          timestamp: Date.now(),
          data: errorResponse
        });
      }

      res.status(500).json(errorResponse);
    }
  }

  /**
   * 处理流式响应
   */
  private async handleStreamResponse(
    requestId: string,
    upstreamRes: globalThis.Response,
    res: ExpressResponse,
    body: ChatCompletionRequest,
    startTime: number,
    filterMarkers?: string[],
    contextTruncated: boolean = false,
    savedTokens: number = 0
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = upstreamRes.body?.getReader();
    if (!reader) {
      throw new BadGatewayError('无法获取上游响应流');
    }

    let totalTokens = 0;
    let promptTokens = 0;
    let completionTokens = 0;
    const chunks: string[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = new TextDecoder().decode(value);
        chunks.push(chunk);
        
        // 解析 SSE 数据尝试提取 token 信息
        const match = chunk.match(/"total_tokens":(\d+)/);
        if (match) {
          totalTokens = parseInt(match[1]);
        }
        const matchPrompt = chunk.match(/"prompt_tokens":(\d+)/);
        if (matchPrompt) {
          promptTokens = parseInt(matchPrompt[1]);
        }
        const matchCompletion = chunk.match(/"completion_tokens":(\d+)/);
        if (matchCompletion) {
          completionTokens = parseInt(matchCompletion[1]);
        }
        
        res.write(value);
      }
    } finally {
      reader.releaseLock();
    }
    
    res.end();

    // ========== 步骤3: 记录从大模型接收的响应 ==========
    if (this.traceLogger) {
      traceStep(requestId, {
        step: 3,
        direction: 'in',
        source: 'upstream',
        timestamp: Date.now(),
        data: {
          status: upstreamRes.status,
          headers: Object.fromEntries(upstreamRes.headers.entries()),
          chunks: chunks
        }
      });
    }

    // 记录流式响应统计
    const finalDuration = Date.now() - startTime;
    
    // 记录流式响应统计
    recordRequest({
      id: requestId,
      timestamp: Date.now(),
      model: body.model || 'unknown',
      promptTokens: promptTokens || Math.ceil(JSON.stringify(body.messages).length / 4),
      completionTokens: completionTokens || Math.max(1, totalTokens - promptTokens),
      totalTokens: totalTokens || promptTokens + completionTokens,
      duration: finalDuration,
      status: 'success',
      requestBody: JSON.stringify(body, null, 2),
      responseBody: JSON.stringify({ chunks: chunks, totalTokens: totalTokens }, null, 2),
      filterMarkers,
      contextTruncated,
      savedTokens: savedTokens
    });

    // ========== 步骤4: 记录转发给 OpenClaw 的响应 ==========
    // 流式响应是分段发送的，这里记录的是整体信息
    if (this.traceLogger) {
      traceStep(requestId, {
        step: 4,
        direction: 'out',
        source: 'openclaw',
        timestamp: Date.now(),
        data: {
          type: 'stream',
          chunkCount: chunks.length,
          totalTokens,
          promptTokens,
          completionTokens
        }
      });
    }
  }

  /**
   * 处理非流式响应
   */
  private async handleNormalResponse(
    requestId: string,
    upstreamRes: globalThis.Response,
    res: ExpressResponse,
    body: ChatCompletionRequest,
    startTime: number,
    filterMarkers?: string[],
    contextTruncated: boolean = false,
    savedTokens: number = 0
  ): Promise<void> {
    // 检查上游响应状态
    if (!upstreamRes.ok) {
      const errorText = await upstreamRes.text();
      logger.error(`[${requestId}] 上游响应错误: ${upstreamRes.status} ${upstreamRes.statusText}`, { body: errorText });
      res.status(upstreamRes.status).json({ error: { message: `上游响应错误: ${upstreamRes.statusText}`, code: 'UPSTREAM_ERROR' } });
      return;
    }

    const data: ChatCompletionResponse = await upstreamRes.json() as ChatCompletionResponse;

    // ========== 步骤3: 记录从大模型接收的响应 ==========
    if (this.traceLogger) {
      traceStep(requestId, {
        step: 3,
        direction: 'in',
        source: 'upstream',
        timestamp: Date.now(),
        data: {
          status: upstreamRes.status,
          headers: Object.fromEntries(upstreamRes.headers.entries()),
          body: data
        }
      });
    }

    // 记录Token使用情况
    if (data.usage) {
      logger.info(`[${requestId}] Token使用`, {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      });
      
      // 记录到统计数据
      const duration = Date.now() - startTime;
      
      recordRequest({
        id: requestId,
        timestamp: Date.now(),
        model: body.model || 'unknown',
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0,
        duration: duration,
        status: 'success',
        requestBody: JSON.stringify(body, null, 2),
        responseBody: JSON.stringify(data, null, 2),
        filterMarkers,
        contextTruncated,
        savedTokens: savedTokens
      });
      
    }

    // ========== 步骤4: 记录转发给 OpenClaw 的响应 ==========
    if (this.traceLogger) {
      traceStep(requestId, {
        step: 4,
        direction: 'out',
        source: 'openclaw',
        timestamp: Date.now(),
        data: {
          statusCode: upstreamRes.status,
          body: data
        }
      });
    }

    res.status(upstreamRes.status).json(data);
  }

  /**
   * 获取所有客户端限流状态（公开方法）
   */
  getAllRateLimitStatus(): ClientStatus[] {
    if (!this.rateLimiter) {
      return [];
    }
    return this.rateLimiter.getAllStatus();
  }

  /**
   * 获取特定客户端限流状态（公开方法）
   */
  getClientRateLimitStatus(clientId: string): ClientStatus | { enabled: false; message: string } {
    if (!this.rateLimiter) {
      return { enabled: false, message: '限流器未启用' };
    }
    return this.rateLimiter.getClientStatus(clientId);
  }

  /**
   * 获取客户端总数（公开方法）
   */
  getRateLimitClientCount(): number {
    if (!this.rateLimiter) {
      return 0;
    }
    return this.rateLimiter.getAllStatus().length;
  }

  /**
   * 获取锁定中的客户端列表（公开方法）
   */
  getLockedClients(): LockedClientInfo[] {
    if (!this.rateLimiter) {
      return [];
    }
    return this.rateLimiter.getLockedClients();
  }

  /**
   * 手动解除限流锁定（公开方法）
   */
  resetRateLimit(clientId?: string): { success: boolean; message: string } {
    if (!this.rateLimiter) {
      return { success: false, message: '限流器未启用' };
    }
    const result = this.rateLimiter.unlock(clientId);
    return { success: result.success, message: result.message };
  }

  /**
   * 解除所有客户端限流（公开方法）
   */

  /**
   * 截断上下文，只保留最近 N 轮对话
   * @param messages 原始消息数组
   * @param maxRounds 保留的轮数（0 = 只保留最后一条用户消息）
   * @returns 截断后的消息数组
   */
  private truncateContext(messages: ChatMessage[], maxRounds: number): { messages: ChatMessage[]; truncated: boolean; removedCount: number; savedTokens: number; stats?: { chineseChars: number; otherChars: number; chineseTokens: number; otherTokens: number } } {
    if (!messages || messages.length === 0) {
      return { messages, truncated: false, removedCount: 0, savedTokens: 0 };
    }
    
    // 分离系统提示词和其他消息
    const systemMsgs = messages.filter(m => m.role === "system");
    const otherMsgs = messages.filter(m => m.role !== "system");
    
    // maxRounds = 0 时，只保留最后一条用户消息
    if (maxRounds === 0) {
      const userMsgs = otherMsgs.filter(m => m.role === "user");
      if (userMsgs.length === 0) {
        return { messages, truncated: false, removedCount: 0, savedTokens: 0 };
      }
      const lastUserMsg = userMsgs[userMsgs.length - 1];
      const removedMsgs = otherMsgs.filter(m => m !== lastUserMsg);
      const removedCount = removedMsgs.length;
      
      // 计算被移除消息的 Token 数
      let savedTokens = 0;
      for (const msg of removedMsgs) {
        savedTokens += this.estimateTokens(msg);
      }
      
      logger.info(`[截断] maxRounds=0，只保留最后一条用户消息，从 ${messages.length} 条减少到 ${systemMsgs.length + 1} 条，移除 ${removedCount} 条，节省 ${savedTokens} tokens`);
      
      return { messages: [...systemMsgs, lastUserMsg], truncated: true, removedCount, savedTokens };
    }
    
    // 找到所有用户消息的索引位置（在 otherMsgs 中）
    const userMsgIndices: number[] = [];
    for (let i = 0; i < otherMsgs.length; i++) {
      if (otherMsgs[i].role === "user") {
        userMsgIndices.push(i);
      }
    }
    
    // 用户消息数量不足，不需要截断（至少要有 maxRounds+1 个用户消息）
    if (userMsgIndices.length <= maxRounds) {
      return { messages, truncated: false, removedCount: 0, savedTokens: 0 };
    }
    
    // 从倒数第 (maxRounds+1) 个用户消息开始保留
    // maxRounds=1: 保留上一轮 + 当前 = 从倒数第2个用户消息开始
    // maxRounds=2: 保留上两轮 + 当前 = 从倒数第3个用户消息开始
    const startIndex = userMsgIndices[userMsgIndices.length - maxRounds - 1];
    const removedMsgs = otherMsgs.slice(0, startIndex);
    const recentMsgs = otherMsgs.slice(startIndex);
    const removedCount = removedMsgs.length;
    
    // 计算被移除消息的 Token 数（这才是真正节省的 Token）
    let savedTokens = 0;
    let totalChineseChars = 0;
    let totalEnglishChars = 0;
    let totalDigitChars = 0;
    let totalJsonStructChars = 0;
    
    const chineseCoeff = this.config.contextTruncation?.tokenEstimation?.chineseChar ?? this.config.tokenEstimation?.chineseChar ?? 1.0;
    const englishCoeff = this.config.contextTruncation?.tokenEstimation?.englishChar ?? this.config.tokenEstimation?.englishChar ?? 0.5;
    const digitCoeff = this.config.contextTruncation?.tokenEstimation?.digitChar ?? this.config.tokenEstimation?.digitChar ?? 0.6;
    const jsonStructCoeff = this.config.contextTruncation?.tokenEstimation?.jsonStructChar ?? this.config.tokenEstimation?.jsonStructChar ?? 0.7;
    
    for (const msg of removedMsgs) {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);

      // 批量正则匹配，避免逐字符遍历
      totalChineseChars += content.match(CHAR_PATTERNS.chinese)?.length || 0;
      totalEnglishChars += content.match(CHAR_PATTERNS.english)?.length || 0;
      totalDigitChars += content.match(CHAR_PATTERNS.digit)?.length || 0;
      totalJsonStructChars += content.match(CHAR_PATTERNS.jsonStruct)?.length || 0;
    }
    
    const chineseTokens = Math.ceil(totalChineseChars * chineseCoeff);
    const englishTokens = Math.ceil(totalEnglishChars * englishCoeff);
    const digitTokens = Math.ceil(totalDigitChars * digitCoeff);
    const jsonStructTokens = Math.ceil(totalJsonStructChars * jsonStructCoeff);
    savedTokens = chineseTokens + englishTokens + digitTokens + jsonStructTokens;
    
    logger.info(`[截断] 保留最近 ${maxRounds} 轮，从 ${messages.length} 条消息减少到 ${systemMsgs.length + recentMsgs.length} 条，移除 ${removedCount} 条，节省 ${savedTokens} tokens（中文: ${totalChineseChars}/${chineseTokens}, 英文: ${totalEnglishChars}/${englishTokens}, 数字: ${totalDigitChars}/${digitTokens}, JSON: ${totalJsonStructChars}/${jsonStructTokens}）`);
    
    return { messages: [...systemMsgs, ...recentMsgs], truncated: true, removedCount, savedTokens, stats: { chineseChars: totalChineseChars, otherChars: totalEnglishChars + totalDigitChars + totalJsonStructChars, chineseTokens, otherTokens: englishTokens + digitTokens + jsonStructTokens } };
  }
  
  /**
   * 估算消息的 Token 数（改进算法：中文1.5倍，英文1倍，每字符约0.6-0.8 token）
   * 测试调优：根据实际对比结果调整系数
   */
  private estimateTokens(msg: ChatMessage): number {
    const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);

    // 批量正则匹配，避免逐字符遍历
    const chineseChars = content.match(CHAR_PATTERNS.chinese)?.length || 0;
    const englishChars = content.match(CHAR_PATTERNS.english)?.length || 0;
    const digitChars = content.match(CHAR_PATTERNS.digit)?.length || 0;
    const jsonStructChars = content.match(CHAR_PATTERNS.jsonStruct)?.length || 0;

    // 从配置读取系数，优先读嵌套配置，fallback 到顶层配置（向后兼容）
    const chineseCoeff = this.config.contextTruncation?.tokenEstimation?.chineseChar ?? this.config.tokenEstimation?.chineseChar ?? 1.0;
    const englishCoeff = this.config.contextTruncation?.tokenEstimation?.englishChar ?? this.config.tokenEstimation?.englishChar ?? 0.5;
    const digitCoeff = this.config.contextTruncation?.tokenEstimation?.digitChar ?? this.config.tokenEstimation?.digitChar ?? 0.6;
    const jsonStructCoeff = this.config.contextTruncation?.tokenEstimation?.jsonStructChar ?? this.config.tokenEstimation?.jsonStructChar ?? 0.7;

    // 加上消息结构的固定开销（role, name等约4 tokens）
    const structureOverhead = 4;
    const estimatedTokens = Math.ceil(
      chineseChars * chineseCoeff +
      englishChars * englishCoeff +
      digitChars * digitCoeff +
      jsonStructChars * jsonStructCoeff
    ) + structureOverhead;

    return estimatedTokens;
  }
  resetAllRateLimits(): { success: boolean; message: string; unlockedCount?: number } {
    if (!this.rateLimiter) {
      return { success: false, message: '限流器未启用' };
    }
    return this.rateLimiter.unlock();
  }

  /**
   * 处理 Anthropic 协议请求转发
   */
  async handleAnthropicRequest(req: ExpressRequest, res: ExpressResponse): Promise<void> {
    const requestId = Math.random().toString(36).substring(2, 8);
    const startTime = Date.now();
    let body = req.body as AnthropicMessagesRequest;
    let filterMarkers: string[] | undefined;
    let contextTruncated = false;

    try {
      let messages = body.messages || [];
      const stream = body.stream === true;

      // ========== 内容过滤（输入） ==========
      if (this.config.contentFilter?.enabled) {
        const filterResult = this.filterAnthropicObject(body, this.config.contentFilter);
        if (filterResult.filtered) {
          body = filterResult.body;
          logger.info(`[${requestId}] Anthropic 输入内容已过滤`);
          filterMarkers = ['Privacy'];
        }
      }

      // ========== 命令检测（可能触发上下文截断） ==========
      let savedTokens = 0;
      if (this.config.commands?.enabled) {
        const commandResult = detectCommand(messages, this.config.commands);
        if (commandResult.detected && commandResult.shouldTruncateContext) {
          const truncateResult = this.truncateAnthropicContext(messages, commandResult.maxRounds || 0);
          messages = truncateResult.messages;
          contextTruncated = true;
          savedTokens = truncateResult.savedTokens;
          body.messages = messages;

          if (!filterMarkers) filterMarkers = [];
          filterMarkers.push(`Context ${commandResult.maxRounds || 0}`);

          logger.info(`[${requestId}] Anthropic 命令触发上下文截断`, {
            command: commandResult.command,
            maxRounds: commandResult.maxRounds,
            savedTokens
          });
        }
      }

      // ========== 步骤1: 记录接收的请求 ==========
      if (this.traceLogger) {
        traceStep(requestId, {
          step: 1,
          direction: 'in',
          source: 'anthropic-client',
          timestamp: Date.now(),
          data: {
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: body
          }
        });
      }

      // 模型替换（使用独立的 anthropicModelOverride）
      const originalModel = body.model;
      if (this.config.anthropicModelOverride?.enabled) {
        body.model = this.config.anthropicModelOverride.model;
        logger.info(`[${requestId}] Anthropic 模型替换: ${originalModel} → ${body.model}`);
      }

      // API Key 替换（使用独立的 anthropicApiKeyOverride）
      let apiKeyHeader: string | undefined;
      if (this.config.anthropicApiKeyOverride?.enabled && this.config.anthropicApiKeyOverride.apiKey) {
        apiKeyHeader = this.config.anthropicApiKeyOverride.apiKey;
        logger.info(`[${requestId}] Anthropic API Key 替换`);
      } else {
        // 复用客户端提供的 x-api-key 或 Authorization
        apiKeyHeader = req.headers['x-api-key'] as string ||
          (req.headers.authorization?.replace('Bearer ', ''));
      }

      // 记录请求信息
      logger.info(`[${requestId}] Anthropic 新请求`, {
        model: body.model,
        messageCount: messages.length,
        stream,
        contentLength: JSON.stringify(body).length
      });

      // 限流检查
      if (this.rateLimiter) {
        const rateLimitResult = this.rateLimiter.check(req);

        if (!rateLimitResult.allowed) {
          logger.warn(`[${requestId}] Anthropic 限流触发`, {
            retryAfter: rateLimitResult.retryAfter,
            resetTime: new Date(rateLimitResult.resetTime).toISOString()
          });

          const rateLimitResponse = {
            type: 'error',
            error: {
              type: 'rate_limit_error',
              message: `请求过于频繁，请稍后重试`,
            }
          };

          res.status(429).json(rateLimitResponse);
          return;
        }
      }

      // 循环保护检查（Anthropic 也支持 tool_use）
      if (this.loopGuard) {
        // 将 Anthropic 请求转换为通用格式进行循环检测
        const genericBody = {
          model: body.model,
          messages: body.messages.map(m => ({
            role: m.role,
            content: typeof m.content === 'string' ? m.content :
              (m.content as AnthropicContent[]).filter(c => c.type === 'text').map(c => c.text || '').join('')
          })),
          tools: body.tools?.map(t => ({ function: { name: t.name } }))
        };
        const guardResult = this.loopGuard.check(genericBody as unknown as ChatCompletionRequest);

        if (guardResult.action === 'stop') {
          logger.warn(`[${requestId}] Anthropic 循环熔断触发 (${guardResult.count}次)`);
          const stopResponse = this.createAnthropicStopResponse();
          res.json(stopResponse);
          return;
        }
      }

      // 构建转发请求
      const upstreamUrl = this.config.anthropicUpstream || 'https://api.anthropic.com';
      const suffix = this.config.anthropicUpstreamSuffix || '/v1/messages';
      const targetUrl = `${upstreamUrl}${suffix}`;

      logger.debug(`[${requestId}] Anthropic 转发到: ${targetUrl}`);

      // ========== 步骤2: 记录转发请求 ==========
      if (this.traceLogger) {
        traceStep(requestId, {
          step: 2,
          direction: 'out',
          source: 'anthropic-upstream',
          timestamp: Date.now(),
          data: {
            url: targetUrl,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKeyHeader ? '(hidden)' : undefined,
              'anthropic-version': '2023-06-01'
            },
            body: body
          }
        });
      }

      // 发送请求到上游
      const controller = new AbortController();
      const timeoutMs = this.config.timeout?.upstream || 60000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const upstreamRes = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKeyHeader || '',
          'anthropic-version': '2023-06-01',
          'Accept': stream ? 'text/event-stream' : 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;

      logger.info(`[${requestId}] Anthropic 上游响应`, {
        status: upstreamRes.status,
        duration: `${duration}ms`,
        contentType: upstreamRes.headers.get('content-type')
      });

      // 处理响应
      if (stream) {
        await this.handleAnthropicStreamResponse(requestId, upstreamRes, res, body, startTime, filterMarkers, contextTruncated, savedTokens);
      } else {
        await this.handleAnthropicNormalResponse(requestId, upstreamRes, res, body, startTime, filterMarkers, contextTruncated, savedTokens);
      }

    } catch (error) {
      const duration = Date.now() - startTime;

      const errorDetails: Record<string, unknown> = {
        errorMessage: error instanceof Error ? error.message : String(error),
        duration: `${duration}ms`,
      };

      if (error instanceof Error) {
        errorDetails.errorName = error.name;
        errorDetails.errorStack = error.stack;
        const cause = (error as { cause?: unknown }).cause;
        if (cause) {
          errorDetails.cause = cause;
          if (cause instanceof Error) {
            errorDetails.causeMessage = cause.message;
            errorDetails.causeCode = (cause as { code?: string }).code;
          }
        }
        const sysError = error as { code?: string; errno?: number };
        if (sysError.code) {
          errorDetails.errorCode = sysError.code;
        }
      }

      logger.error(`[${requestId}] Anthropic 请求失败`, errorDetails);

      const errorResponse = {
        type: 'error',
        error: {
          type: 'proxy_error',
          message: error instanceof Error ? error.message : '未知错误',
        }
      };

      recordRequest({
        id: requestId,
        timestamp: Date.now(),
        model: body.model || 'unknown',
        promptTokens: Math.ceil(JSON.stringify(body.messages || {}).length / 4),
        completionTokens: 0,
        totalTokens: Math.ceil(JSON.stringify(body.messages || {}).length / 4),
        duration: duration,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : '未知错误',
        requestBody: JSON.stringify(body, null, 2),
        responseBody: JSON.stringify(errorResponse, null, 2)
      });

      res.status(500).json(errorResponse);
    }
  }

  /**
   * 处理 Anthropic 流式响应
   */
  private async handleAnthropicStreamResponse(
    requestId: string,
    upstreamRes: globalThis.Response,
    res: ExpressResponse,
    body: AnthropicMessagesRequest,
    startTime: number,
    filterMarkers?: string[],
    contextTruncated: boolean = false,
    savedTokens: number = 0
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = upstreamRes.body?.getReader();
    if (!reader) {
      throw new BadGatewayError('无法获取 Anthropic 上游响应流');
    }

    let inputTokens = 0;
    let outputTokens = 0;
    const chunks: string[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        chunks.push(chunk);

        // 解析 Anthropic SSE 数据提取 token 信息
        // message_start 事件包含初始 input_tokens
        // message_delta 事件包含最终 output_tokens
        if (chunk.includes('event:message_start') || chunk.includes('"type":"message_start"')) {
          const inputMatch = chunk.match(/"input_tokens":(\d+)/);
          if (inputMatch) {
            inputTokens = parseInt(inputMatch[1]);
          }
        }
        if (chunk.includes('event:message_delta') || chunk.includes('"type":"message_delta"')) {
          const outputMatch = chunk.match(/"output_tokens":(\d+)/);
          if (outputMatch) {
            outputTokens = parseInt(outputMatch[1]);
          }
        }

        res.write(value);
      }
    } finally {
      reader.releaseLock();
    }

    res.end();

    const finalDuration = Date.now() - startTime;

    recordRequest({
      id: requestId,
      timestamp: Date.now(),
      model: body.model || 'unknown',
      promptTokens: inputTokens || Math.ceil(JSON.stringify(body.messages).length / 4),
      completionTokens: outputTokens,
      totalTokens: inputTokens + outputTokens,
      duration: finalDuration,
      status: 'success',
      requestBody: JSON.stringify(body, null, 2),
      responseBody: JSON.stringify({ chunks: chunks, inputTokens, outputTokens }, null, 2),
      filterMarkers,
      contextTruncated,
      savedTokens
    });
  }

  /**
   * 处理 Anthropic 非流式响应
   */
  private async handleAnthropicNormalResponse(
    requestId: string,
    upstreamRes: globalThis.Response,
    res: ExpressResponse,
    body: AnthropicMessagesRequest,
    startTime: number,
    filterMarkers?: string[],
    contextTruncated: boolean = false,
    savedTokens: number = 0
  ): Promise<void> {
    const data: AnthropicMessagesResponse = await upstreamRes.json() as AnthropicMessagesResponse;

    if (data.usage) {
      logger.info(`[${requestId}] Anthropic Token使用`, {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens
      });

      const duration = Date.now() - startTime;

      recordRequest({
        id: requestId,
        timestamp: Date.now(),
        model: body.model || 'unknown',
        promptTokens: data.usage.input_tokens || 0,
        completionTokens: data.usage.output_tokens || 0,
        totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
        duration: duration,
        status: 'success',
        requestBody: JSON.stringify(body, null, 2),
        responseBody: JSON.stringify(data, null, 2),
        filterMarkers,
        contextTruncated,
        savedTokens
      });
    }

    res.status(upstreamRes.status).json(data);
  }

  /**
   * 过滤 Anthropic 请求内容
   */
  private filterAnthropicObject(
    body: AnthropicMessagesRequest,
    config: { enabled: boolean; categories: { privacy: boolean }; replacements: { privacy: string } }
  ): { body: AnthropicMessagesRequest; filtered: boolean } {
    if (!config.enabled || !config.categories?.privacy) {
      return { body, filtered: false };
    }

    const messages = body.messages;
    if (!messages || messages.length === 0) {
      return { body, filtered: false };
    }

    // 过滤最后一条用户消息
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'user') {
        let contentText = '';
        if (typeof msg.content === 'string') {
          contentText = msg.content;
        } else if (Array.isArray(msg.content)) {
          const textBlock = msg.content.find(c => c.type === 'text');
          if (textBlock?.text) {
            contentText = textBlock.text;
          }
        }

        if (contentText) {
          const filterResult = filterText(contentText, config);
          if (filterResult.filtered) {
            if (typeof msg.content === 'string') {
              body.messages[i].content = filterResult.text;
            } else if (Array.isArray(msg.content)) {
              const textBlock = msg.content.find(c => c.type === 'text');
              if (textBlock) {
                textBlock.text = filterResult.text;
              }
            }
            return { body, filtered: true };
          }
        }
        break;
      }
    }

    return { body, filtered: false };
  }

  /**
   * 截断 Anthropic 上下文
   */
  private truncateAnthropicContext(
    messages: AnthropicMessage[],
    maxRounds: number
  ): { messages: AnthropicMessage[]; truncated: boolean; savedTokens: number } {
    if (!messages || messages.length === 0) {
      return { messages, truncated: false, savedTokens: 0 };
    }

    // Anthropic 没有 system role 在 messages 中
    // maxRounds = 0 时，只保留最后一条用户消息
    if (maxRounds === 0) {
      const userMsgs = messages.filter(m => m.role === 'user');
      if (userMsgs.length === 0) {
        return { messages, truncated: false, savedTokens: 0 };
      }
      const lastUserMsg = userMsgs[userMsgs.length - 1];
      const removedMsgs = messages.filter(m => m !== lastUserMsg);
      let savedTokens = 0;
      for (const msg of removedMsgs) {
        savedTokens += this.estimateAnthropicTokens(msg);
      }
      logger.info(`[截断 Anthropic] maxRounds=0，只保留最后一条用户消息，节省 ${savedTokens} tokens`);
      return { messages: [lastUserMsg], truncated: true, savedTokens };
    }

    // 找到所有用户消息的索引位置
    const userMsgIndices: number[] = [];
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].role === 'user') {
        userMsgIndices.push(i);
      }
    }

    if (userMsgIndices.length <= maxRounds) {
      return { messages, truncated: false, savedTokens: 0 };
    }

    // 从倒数第 (maxRounds+1) 个用户消息开始保留
    const startIndex = userMsgIndices[userMsgIndices.length - maxRounds - 1];
    const removedMsgs = messages.slice(0, startIndex);
    const recentMsgs = messages.slice(startIndex);
    let savedTokens = 0;
    for (const msg of removedMsgs) {
      savedTokens += this.estimateAnthropicTokens(msg);
    }

    logger.info(`[截断 Anthropic] 保留最近 ${maxRounds} 轮，节省 ${savedTokens} tokens`);

    return { messages: recentMsgs, truncated: true, savedTokens };
  }

  /**
   * 估算 Anthropic 消息的 Token 数
   */
  private estimateAnthropicTokens(msg: AnthropicMessage): number {
    let contentText = '';
    if (typeof msg.content === 'string') {
      contentText = msg.content;
    } else if (Array.isArray(msg.content)) {
      contentText = msg.content
        .filter(c => c.type === 'text')
        .map(c => c.text || '')
        .join('');
    }

    const chineseChars = contentText.match(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/g)?.length || 0;
    const englishChars = contentText.match(/[a-zA-Z]/g)?.length || 0;
    const digitChars = contentText.match(/[0-9]/g)?.length || 0;
    const jsonStructChars = contentText.match(/[{}[\]:"',\\]/g)?.length || 0;

    const chineseCoeff = this.config.tokenEstimation?.chineseChar ?? 1.0;
    const englishCoeff = this.config.tokenEstimation?.englishChar ?? 0.5;
    const digitCoeff = this.config.tokenEstimation?.digitChar ?? 0.6;
    const jsonStructCoeff = this.config.tokenEstimation?.jsonStructChar ?? 0.7;

    return Math.ceil(
      chineseChars * chineseCoeff +
      englishChars * englishCoeff +
      digitChars * digitCoeff +
      jsonStructChars * jsonStructCoeff
    ) + 4;
  }

  /**
   * 创建 Anthropic 停止响应（循环熔断）
   */
  private createAnthropicStopResponse(): AnthropicMessagesResponse {
    return {
      id: `stop_${Math.random().toString(36).substring(2, 8)}`,
      type: 'message',
      role: 'assistant',
      content: [
        { type: 'text', text: '检测到可能的工具调用循环，已自动停止。请检查您的工具设计或手动调整对话。' }
      ],
      model: 'savor-guard',
      stop_reason: 'stop_sequence',
      usage: { input_tokens: 0, output_tokens: 1 }
    };
  }

  /**
   * 更新配置（热更新）
   */
  updateConfig(newConfig: Partial<SavorConfig>): void {
    // 更新本地配置引用
    Object.assign(this.config, newConfig);

    // 更新 LoopGuard 配置
    if (newConfig.loopGuard && this.loopGuard) {
      this.loopGuard.updateConfig(newConfig.loopGuard);
    }

    // 更新 RateLimiter 配置
    if (newConfig.rateLimit && this.rateLimiter) {
      this.rateLimiter.updateConfig(newConfig.rateLimit);
    }

    // 更新内容过滤配置
    if (newConfig.contentFilter) {
      updateFilterConfig(newConfig.contentFilter);
    }

    this.logger.info('[Proxy] 配置已热更新', Object.keys(newConfig));
  }
}
