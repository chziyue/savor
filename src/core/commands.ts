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
 * Savor - 命令处理模块
 * 检测用户输入的特殊命令并执行相应操作
 */

import type { ChatMessage } from '../types/index.js';
import type { AnthropicMessage } from '../types/index.js';
import type { CommandsConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * 消息类型（支持 OpenAI 和 Anthropic）
 */
export type ProtocolMessage = ChatMessage | AnthropicMessage;

/**
 * 转义正则表达式特殊字符
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 命令检测结果
 */
export interface CommandResult {
  detected: boolean;           // 是否检测到命令
  command?: string;            // 命令名称（如 '翻译'）
  shouldTruncateContext: boolean; // 是否应该截断上下文
  maxRounds?: number;          // 截断轮数（0 = 只保留当前消息）
}

/**
 * 检测消息中的命令
 * @param messages 消息数组（支持 OpenAI 和 Anthropic 格式）
 * @param config 命令配置
 * @returns 命令检测结果
 */
export function detectCommand(
  messages: ProtocolMessage[],
  config: CommandsConfig
): CommandResult {
  if (!config.enabled) {
    return { detected: false, shouldTruncateContext: false };
  }

  // 获取最后一条用户消息
  const userMessages = messages.filter(m => m.role === 'user');
  if (userMessages.length === 0) {
    return { detected: false, shouldTruncateContext: false };
  }

  const lastUserMsg = userMessages[userMessages.length - 1];

  const prefix = config.prefix || '\\';

  // 提取纯文本内容块（每块单独检测，避免拼接后影响检测）
  const pureTexts = extractPureCommandText(lastUserMsg.content);

  // 遍历每个纯文本块检测命令
  for (const pureText of pureTexts) {
    // 检查 OpenClaw 时间戳格式：[Mon 2026-03-30 23:06 GMT+8] \翻译 hello
    const translatePattern = new RegExp(`^\\[.+?\\]\\s*${escapeRegExp(prefix)}翻译\\s`, 'm');
    if (translatePattern.test(pureText)) {
      logger.info(`[命令] 检测到翻译命令（时间戳后），将截断上下文`);
      return {
        detected: true,
        command: '翻译',
        shouldTruncateContext: true,
        maxRounds: 0
      };
    }

    // 裁切控制命令: \0, \1, \2, ... \N（时间戳格式）
    const truncatePattern = new RegExp(`^\\[.+?\\]\\s*${escapeRegExp(prefix)}(\\d+)\\s`, 'm');
    const truncateMatch = pureText.match(truncatePattern);
    if (truncateMatch) {
      const rounds = parseInt(truncateMatch[1], 10);
      logger.info(`[命令] 检测到裁切控制命令（时间戳后），保留 ${rounds} 轮`);
      return {
        detected: true,
        command: `裁切${rounds}`,
        shouldTruncateContext: true,
        maxRounds: rounds
      };
    }

    // 检查是否以命令前缀开头（直接调用场景）
    if (pureText.startsWith(prefix)) {
      const afterPrefix = pureText.slice(prefix.length).trim();
      const commandName = afterPrefix.split(/\s+/)[0] || '';

      // 翻译命令
      if (commandName === '翻译' || commandName === 'translate') {
        logger.info(`[命令] 检测到翻译命令（直接开头），将截断上下文`);
        return {
          detected: true,
          command: '翻译',
          shouldTruncateContext: true,
          maxRounds: 0
        };
      }

      // 裁切控制命令: \0, \1, \2, ... \N
      const directTruncateMatch = commandName.match(/^(\d+)$/);
      if (directTruncateMatch) {
        const rounds = parseInt(directTruncateMatch[1], 10);
        logger.info(`[命令] 检测到裁切控制命令，保留 ${rounds} 轮`);
        return {
          detected: true,
          command: `裁切${rounds}`,
          shouldTruncateContext: true,
          maxRounds: rounds
        };
      }

      // 其他命令暂不支持
      return { detected: true, command: commandName, shouldTruncateContext: false };
    }
  }

  return { detected: false, shouldTruncateContext: false };
}

/**
 * 从消息内容中提取纯文本块数组
 * 用于命令检测：每块单独检测，避免拼接后影响开头匹配
 * 支持字符串和数组格式（OpenAI 和 Anthropic）
 */
function extractPureCommandText(content: string | ProtocolMessage['content']): string[] {
  if (typeof content === 'string') {
    return [content];
  }
  // 数组格式，提取每个 text block 的内容
  if (Array.isArray(content)) {
    return content
      .filter(part => part.type === 'text' && part.text)
      .map(part => part.text || '');
  }
  return [];
}