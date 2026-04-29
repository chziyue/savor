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
 * Savor - 内容过滤模块（精简版）
 * 只保留隐私过滤
 */

import { logger } from './logger.js';

/**
 * 过滤规则类型
 */
export type FilterCategory = 
  | 'privacy';    // 个人隐私（包含 Token、密码、私钥等敏感信息）

/**
 * 过滤结果
 */
export interface FilterResult {
  text: string;                    // 过滤后的文本
  filtered: boolean;               // 是否有内容被过滤
  categories: FilterCategory[];    // 被触发的过滤类别
  details: FilterDetail[];         // 详细过滤信息
}

/**
 * 过滤详情
 */
export interface FilterDetail {
  category: FilterCategory;
  type: string;        // 具体过滤类型（如"手机号"、"Token"）
  line?: number;       // 行号
  replacement: string; // 替换内容
}

/**
 * 过滤配置
 */
export interface FilterConfig {
  enabled: boolean;
  categories: {
    privacy: boolean;
  };
  replacements: {
    privacy: string;
  };
}

/**
 * 简化配置格式（兼容旧格式）
 */
interface SimpleFilterConfig {
  enabled?: boolean;
  privacy?: boolean;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: FilterConfig = {
  enabled: true,
  categories: {
    privacy: true    // 个人隐私默认启用（包含 Token、密码、私钥等）
  },
  replacements: {
    privacy: '<隐私信息已过滤>'
  }
};

/**
 * 正则规则库
 */
const PATTERNS = {
  // 个人隐私
  privacy: {
    phone: /(?<!\d)(?:(?:\+?86[- ]?)?(?:1[3-9]\d{9}|13\d{9}|14\d{9}|15\d{9}|16\d{9}|17\d{9}|18\d{9}|19\d{9}))(?!\d)/g,
    idCard: /(?<!\d)(?:[1-9]\d{5}(?:18|19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx])(?!\d)/g,
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    bankCard: /(?<!\d)(?:[1-9]\d{15,18})(?!\d)/g,
    // Token、密码、私钥等敏感信息（已合并到隐私过滤）
    token: /(?:(?:bearer)|(?:token))\s+[:=]?\s*[a-zA-Z0-9_.-]{20,}/gi,
    password: /(?:(?:password)|(?:passwd)|(?:pwd))\s*[:=]\s*["']?[^\s"']{4,}["']?/gi,
    privateKey: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA )?PRIVATE KEY-----/g,
  },
};

/**
 * 当前配置
 */
let currentConfig: FilterConfig = { ...DEFAULT_CONFIG };

/**
 * 更新配置
 */
export function updateFilterConfig(config: Partial<FilterConfig>) {
  currentConfig = { ...currentConfig, ...config };
  logger.info('[Filter] 配置已更新', currentConfig);
}

/**
 * 获取当前配置
 */
export function getFilterConfig(): FilterConfig {
  return { ...currentConfig };
}

/**
 * 过滤文本内容
 */
export function filterText(text: string, config?: FilterConfig | SimpleFilterConfig): FilterResult {
  // 兼容简化格式：{ enabled: true, privacy: true }
  let normalizedConfig: FilterConfig;
  
  if (config && 'privacy' in config) {
    // 简化格式，转换为完整格式
    const simpleConfig = config as SimpleFilterConfig;
    normalizedConfig = {
      enabled: simpleConfig.enabled ?? true,
      categories: { privacy: simpleConfig.privacy ?? true },
      replacements: { privacy: '<privacy-filtered>' }
    };
  } else {
    // 完整格式
    normalizedConfig = {
      ...currentConfig,
      ...(config || {}),
      categories: {
        ...currentConfig.categories,
        ...((config as FilterConfig)?.categories || {}),
      },
      replacements: {
        ...currentConfig.replacements,
        ...((config as FilterConfig)?.replacements || {}),
      },
    };
  }
  
  const cfg = normalizedConfig;
  const result: FilterResult = {
    text,
    filtered: false,
    categories: [],
    details: []
  };

  if (!cfg.enabled) {
    return result;
  }

  const lines = text.split('\n');
  const processedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const lineNum = i + 1;

    // 个人隐私（包含手机号、身份证、邮箱、银行卡、Token、密码、私钥）
    if (cfg.categories?.privacy) {
      const privacyChecks = [
        { pattern: PATTERNS.privacy.phone, type: '手机号' },
        { pattern: PATTERNS.privacy.idCard, type: '身份证号' },
        { pattern: PATTERNS.privacy.email, type: '邮箱' },
        { pattern: PATTERNS.privacy.bankCard, type: '银行卡号' },
        { pattern: PATTERNS.privacy.token, type: 'Token' },
        { pattern: PATTERNS.privacy.password, type: '密码' },
        { pattern: PATTERNS.privacy.privateKey, type: '私钥' },
      ];

      for (const check of privacyChecks) {
        const replacement = cfg.replacements?.privacy || '<filtered>';
        const newLine = line.replace(check.pattern, replacement);
        if (newLine !== line) {
          line = newLine;
          addDetail(result, 'privacy', check.type, lineNum, replacement);
        }
      }
    }

    processedLines.push(line);
  }

  result.text = processedLines.join('\n');
  result.filtered = result.details.length > 0;
  result.categories = [...new Set(result.details.map(d => d.category))];

  return result;
}

/**
 * 添加过滤详情
 */
function addDetail(
  result: FilterResult,
  category: FilterCategory,
  type: string,
  line: number,
  replacement: string
) {
  result.details.push({
    category,
    type,
    line,
    replacement
  });
}

/**
 * 过滤请求体（只过滤用户当前输入的消息）
 */
export interface FilterObjectResult {
  data: Record<string, unknown>;
  categories: FilterCategory[];
}

interface ChatMessage {
  role: string;
  content: string | ContentPart[];
}

interface ContentPart {
  type: string;
  text?: string;
}

interface RequestBody {
  messages?: ChatMessage[];
  [key: string]: unknown;
}

export function filterObject(obj: RequestBody, config?: FilterConfig): FilterObjectResult {
  const allCategories = new Set<FilterCategory>();
  
  // 过滤用户当前输入的消息（messages 数组中最后一条 user 消息）
  if (obj.messages && Array.isArray(obj.messages)) {
    for (let i = obj.messages.length - 1; i >= 0; i--) {
      const msg = obj.messages[i];
      
      if (msg && msg.role === 'user') {
        // 处理 content 可能是数组的情况（OpenClaw 格式）
        let contentText = '';
        if (typeof msg.content === 'string') {
          contentText = msg.content;
        } else if (Array.isArray(msg.content)) {
          contentText = msg.content
            .filter((part: ContentPart) => part.type === 'text')
            .map((part: ContentPart) => part.text || '')
            .join('');
        }
        
        if (contentText) {
          const filterResult = filterText(contentText, config);
          
          if (filterResult.filtered) {
            // 根据原始 content 类型决定如何更新
            if (typeof msg.content === 'string') {
              msg.content = filterResult.text;
            } else if (Array.isArray(msg.content)) {
              const textPart = msg.content.find((part: ContentPart) => part.type === 'text');
              if (textPart) {
                textPart.text = filterResult.text;
              }
            }
            
            filterResult.categories.forEach(cat => allCategories.add(cat));
            logger.info('[Filter] 过滤用户消息', {
              field: 'messages[].content',
              categories: filterResult.categories,
              count: filterResult.details.length,
              details: filterResult.details.map(d => ({
                type: d.type,
                line: d.line,
                category: d.category
              }))
            });
          }
        }
        break;
      }
    }
  }
  
  return { data: obj, categories: Array.from(allCategories) };
}

/**
 * 生成过滤标记（用于 Web 页面显示）
 */
export function getFilterMarkers(categories: FilterCategory[]): string[] {
  const markers: string[] = [];
  
  if (categories.includes('privacy')) markers.push('Privacy');
  
  return markers;
}
