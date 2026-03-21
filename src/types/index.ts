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