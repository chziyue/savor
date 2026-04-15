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
 * Savor - 类型定义
 * 定义 API 请求/响应的数据结构
 */

/**
 * 聊天消息
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | ChatMessageContent[];
  name?: string;
  tool_call_id?: string;
}

/**
 * 聊天消息内容（多模态）
 */
export interface ChatMessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

/**
 * 工具定义
 */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

/**
 * 聊天完成请求
 */
export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  [key: string]: unknown;
}

/**
 * 聊天完成响应
 */
export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * 聊天完成选项
 */
export interface ChatCompletionChoice {
  index: number;
  message?: {
    role: string;
    content?: string;
    tool_calls?: ToolCall[];
  };
  delta?: {
    role?: string;
    content?: string;
    tool_calls?: ToolCall[];
    reasoning_content?: string;
  };
  finish_reason: string | null;
}

/**
 * 工具调用
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * 每日统计数据
 */
export interface DailyStats {
  total_requests: number;
  success_requests: number;
  error_requests: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  avg_duration: number;
}

/**
 * 请求记录
 */
export interface RequestLog {
  id: string;
  timestamp: number;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  duration: number;
  status: 'success' | 'error' | 'rate_limited';
  errorMessage?: string;
  filterMarkers?: string[];
  contextTruncated?: boolean;
  savedTokens?: number;
}

/**
 * 用户状态（限流）
 */
export interface UserRateLimitState {
  requests: number[];
  isLocked: boolean;
  lockTime?: number;
  autoUnlockAt?: number;
}

/**
 * 限流检查结果
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  locked?: boolean;
  clientId: string;
  autoUnlockAt?: string;
}

/**
 * 配置对象
 */
export interface ConfigObject {
  [key: string]: unknown;
}

// ==================== Anthropic Messages API 类型 ====================

/**
 * Anthropic 消息
 */
export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContent[];
}

/**
 * Anthropic 内容块
 */
export interface AnthropicContent {
  type: 'text' | 'image';
  text?: string;
  source?: {
    type: 'base64' | 'url';
    media_type?: string;
    data?: string;
    url?: string;
  };
}

/**
 * Anthropic 工具定义
 */
export interface AnthropicTool {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
}

/**
 * Anthropic Messages 请求
 */
export interface AnthropicMessagesRequest {
  model: string;
  messages: AnthropicMessage[];
  system?: string;
  max_tokens: number;
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  tools?: AnthropicTool[];
  tool_choice?: { type: 'auto' | 'any' | 'tool'; name?: string };
  metadata?: { user_id?: string };
  [key: string]: unknown;
}

/**
 * Anthropic Messages 响应
 */
export interface AnthropicMessagesResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: AnthropicContent[];
  model: string;
  stop_reason?: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';
  stop_sequence?: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Anthropic 流式事件
 */
export interface AnthropicStreamEvent {
  type: 'message_start' | 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_delta' | 'message_stop';
  index?: number;
  delta?: {
    type?: 'text_delta' | 'input_json_delta';
    text?: string;
    partial_json?: string;
  };
  content_block?: AnthropicContent;
  message?: AnthropicMessagesResponse;
  usage?: {
    output_tokens?: number;
  };
}