/**
 * Savor - 请求验证 Schema
 * 基于 Zod 定义 API 请求格式
 */

import { z } from 'zod';

/**
 * Chat Completions 请求 Schema
 */
export const chatCompletionsSchema = z.object({
  body: z.object({
    model: z.string().min(1, '模型名称不能为空'),
    messages: z.array(
      z.object({
        role: z.enum(['system', 'user', 'assistant', 'tool']),
        content: z.union([z.string(), z.array(z.any())]).optional(),
        name: z.string().optional(),
        tool_call_id: z.string().optional(),
        tool_calls: z.array(z.any()).optional(),
      })
    ).min(1, '消息列表不能为空'),
    
    // 可选参数
    temperature: z.number().min(0).max(2).optional(),
    top_p: z.number().min(0).max(1).optional(),
    n: z.number().int().min(1).optional(),
    stream: z.boolean().optional(),
    stop: z.union([z.string(), z.array(z.string())]).optional(),
    max_tokens: z.number().int().min(1).optional(),
    presence_penalty: z.number().min(-2).max(2).optional(),
    frequency_penalty: z.number().min(-2).max(2).optional(),
    user: z.string().optional(),
    
    // Tools
    tools: z.array(z.any()).optional(),
    tool_choice: z.union([z.string(), z.object({})]).optional(),
    
    // 允许其他字段
  }).passthrough(),
  query: z.record(z.string(), z.any()).optional(),
  params: z.record(z.string(), z.any()).optional(),
});

/**
 * Rate Limit Reset 请求 Schema
 */
export const rateLimitResetSchema = z.object({
  query: z.object({
    clientId: z.string().optional(),
    all: z.enum(['true', 'false']).optional(),
  }),
  body: z.any().optional(),
  params: z.record(z.string(), z.any()).optional(),
});

/**
 * 健康检查宽松验证
 */
export const healthCheckSchema = z.object({
  query: z.record(z.string(), z.any()).optional(),
  params: z.record(z.string(), z.any()).optional(),
  body: z.any().optional(),
});