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
 * Savor - 请求验证 Schema
 * 基于 Zod 定义 API 请求格式
 */

import { z } from 'zod';

// ==================== 参数范围常量 ====================

/** Temperature 参数范围 */
export const TEMP_MIN = 0;
export const TEMP_MAX = 2;

/** Top_p 参数范围 */
export const TOP_P_MIN = 0;
export const TOP_P_MAX = 1;

/** Penalty 参数范围（presence_penalty, frequency_penalty）*/
export const PENALTY_MIN = -2;
export const PENALTY_MAX = 2;

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
    temperature: z.number().min(TEMP_MIN).max(TEMP_MAX).optional(),
    top_p: z.number().min(TOP_P_MIN).max(TOP_P_MAX).optional(),
    n: z.number().int().min(1).optional(),
    stream: z.boolean().optional(),
    stop: z.union([z.string(), z.array(z.string())]).optional(),
    max_tokens: z.number().int().min(1).optional(),
    presence_penalty: z.number().min(PENALTY_MIN).max(PENALTY_MAX).optional(),
    frequency_penalty: z.number().min(PENALTY_MIN).max(PENALTY_MAX).optional(),
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

// ==================== 类型导出 ====================

/** Chat Completions 请求类型 */
export type ChatCompletionsInput = z.infer<typeof chatCompletionsSchema>;

/** Rate Limit Reset 请求类型 */
export type RateLimitResetInput = z.infer<typeof rateLimitResetSchema>;

/** 健康检查请求类型 */
export type HealthCheckInput = z.infer<typeof healthCheckSchema>;