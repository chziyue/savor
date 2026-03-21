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
import { filterObject, getFilterMarkers, type FilterObjectResult } from '../utils/filter.js';
import { BadGatewayError } from '../utils/errors.js';
import { createDependencies } from './factory.js';
import type { SavorConfig } from '../config/index.js';
import type { ProxyDependencies, ILogger } from './types.js';
import type { ChatCompletionRequest, ChatCompletionResponse, ChatMessage } from '../types/index.js';

// 初始化统计模块
initStats();

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
    
    // 初始化循环保护
    if (config.features?.loopGuard !== false) {
      // 如果注入了 loopGuard，使用注入的
      if (finalDeps.loopGuard) {
        this.loopGuard = finalDeps.loopGuard as unknown as LoopGuard;
      }
      this.logger.info('[Proxy] 循环保护已启用', config.loopGuardConfig || {});
    }

    // 初始化限流器
    if (config.features?.rateLimit !== false && config.rateLimitConfig) {
      if (finalDeps.rateLimiter) {
        this.rateLimiter = finalDeps.rateLimiter as unknown as RateLimiter;
      }
      this.logger.info('[Proxy] 限流器已启用', config.rateLimitConfig);
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

      // ========== 上下文截断（节省 Token） ==========
      let savedTokens = 0;
      if (this.config.contextTruncation?.enabled && this.config.contextTruncation.maxRounds > 0) {
        const truncateResult = this.truncateContext(messages, this.config.contextTruncation.maxRounds);
        messages = truncateResult.messages;
        contextTruncated = truncateResult.truncated;
        savedTokens = truncateResult.savedTokens;
        body.messages = messages;
        
        // 添加上下文裁切标记
        if (contextTruncated) {
          if (!filterMarkers) filterMarkers = [];
          filterMarkers.push('✂️Context');
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
        
        switch (guardResult.action) {
          case 'stop':
            // 熔断，直接返回停止响应
            logger.warn(`[${requestId}] 循环熔断触发`);
            
            // 记录熔断响应
            if (this.traceLogger) {
              traceStep(requestId, {
                step: 4,
                direction: 'out',
                source: 'openclaw',
                timestamp: Date.now(),
                data: guardResult.response
              });
            }
            
            res.json(guardResult.response);
            return;
            
          case 'hit': {
            // 命中缓存，直接返回
            logger.info(`[${requestId}] 循环缓存命中 (${guardResult.count}/4)`);
            
            // 记录缓存响应
            if (this.traceLogger) {
              traceStep(requestId, {
                step: 4,
                direction: 'out',
                source: 'openclaw',
                timestamp: Date.now(),
                data: guardResult.response
              });
            }
            
            // 记录缓存命中统计（从缓存中获取token数）
            const cachedTokens = guardResult.response?.usage?.total_tokens || 
                                Math.ceil(JSON.stringify(guardResult.response).length / 4);
            recordRequest({
              id: requestId,
              timestamp: Date.now(),
              model: body.model || 'unknown',
              promptTokens: guardResult.response?.usage?.prompt_tokens || Math.ceil(JSON.stringify(body.messages).length / 4),
              completionTokens: guardResult.response?.usage?.completion_tokens || cachedTokens,
              totalTokens: cachedTokens,
              duration: 0, // 缓存命中耗时为0
              status: 'success',
              requestBody: JSON.stringify(body, null, 2),
              responseBody: JSON.stringify(guardResult.response, null, 2)
            });
            
            res.json(guardResult.response);
            return;
          }
            
          case 'cache':
            // 需要缓存这次响应
            logger.debug(`[${requestId}] 将缓存本次响应`);
            break;
            
          case 'forward':
          default:
            // 正常转发
            break;
        }
      }

      // 构建转发请求（支持 Ollama 等本地模型）
      const upstreamUrl = this.config.upstream;
      const targetUrl = upstreamUrl.includes('11434') 
        ? `${upstreamUrl}/v1/chat/completions`  // Ollama 需要 /v1 前缀
        : `${upstreamUrl}/chat/completions`;
      
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
    
    // 缓存响应（如果是第2次请求）
    if (this.loopGuard) {
      const guardCheck = this.loopGuard.check(body);
      if (guardCheck.action === 'cache') {
        this.loopGuard.cacheResponse(body, data);
      }
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
   * @param maxRounds 保留的轮数
   * @returns 截断后的消息数组
   */
  private truncateContext(messages: ChatMessage[], maxRounds: number): { messages: ChatMessage[]; truncated: boolean; removedCount: number; savedTokens: number; stats?: { chineseChars: number; otherChars: number; chineseTokens: number; otherTokens: number } } {
    if (!messages || messages.length === 0) {
      return { messages, truncated: false, removedCount: 0, savedTokens: 0 };
    }
    
    // 分离系统提示词和其他消息
    const systemMsgs = messages.filter(m => m.role === "system");
    const otherMsgs = messages.filter(m => m.role !== "system");
    
    // 如果消息数量 <= maxRounds * 2（系统消息），不需要截断
    if (otherMsgs.length <= maxRounds * 2) {
      return { messages, truncated: false, removedCount: 0, savedTokens: 0 };
    }
    
    // 只保留最近 maxRounds 轮（每轮 2 条：用户+AI）
    const keepCount = maxRounds * 2;
    const removedMsgs = otherMsgs.slice(0, otherMsgs.length - keepCount);
    const recentMsgs = otherMsgs.slice(-keepCount);
    const removedCount = removedMsgs.length;
    
    // 计算被移除消息的 Token 数（这才是真正节省的 Token）
    let savedTokens = 0;
    let totalChineseChars = 0;
    let totalEnglishChars = 0;
    let totalDigitChars = 0;
    let totalJsonStructChars = 0;
    
    const chineseCoeff = this.config.contextTruncation?.tokenEstimation?.chineseChar ?? 1.8;
    const englishCoeff = this.config.contextTruncation?.tokenEstimation?.englishChar ?? 0.5;
    const digitCoeff = this.config.contextTruncation?.tokenEstimation?.digitChar ?? 0.3;
    const jsonStructCoeff = this.config.contextTruncation?.tokenEstimation?.jsonStructChar ?? 1.3;
    
    for (const msg of removedMsgs) {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      
      for (const char of content) {
        if (/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(char)) {
          totalChineseChars++;
        } else if (/[a-zA-Z]/.test(char)) {
          totalEnglishChars++;
        } else if (/[0-9]/.test(char)) {
          totalDigitChars++;
        } else if (/[{}[\]:"',\\]/.test(char)) {
          totalJsonStructChars++;
        }
        // 其他字符（空格、换行、标点等）忽略或低权重
      }
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
    
    // 统计各类字符
    let chineseChars = 0;
    let englishChars = 0;
    let digitChars = 0;
    let jsonStructChars = 0;
    
    for (const char of content) {
      if (/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(char)) {
        chineseChars++;
      } else if (/[a-zA-Z]/.test(char)) {
        englishChars++;
      } else if (/[0-9]/.test(char)) {
        digitChars++;
      } else if (/[{}[\]:"',\\]/.test(char)) {
        jsonStructChars++;
      }
    }
    
    // 从配置读取系数，没有配置就用默认值（向后兼容）
    const chineseCoeff = this.config.contextTruncation?.tokenEstimation?.chineseChar ?? 1.8;
    const englishCoeff = this.config.contextTruncation?.tokenEstimation?.englishChar ?? 0.5;
    const digitCoeff = this.config.contextTruncation?.tokenEstimation?.digitChar ?? 0.3;
    const jsonStructCoeff = this.config.contextTruncation?.tokenEstimation?.jsonStructChar ?? 1.3;
    
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
}
