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
import { describe, it, expect } from 'vitest';
import { detectCommand } from './commands.js';
import type { ChatMessage } from '../types/index.js';
import type { AnthropicMessage } from '../types/index.js';
import type { CommandsConfig } from '../config/index.js';

/**
 * 基于真实请求体格式的命令检测测试
 *
 * OpenAI 协议参考：savor logs（192.168.5.253:3456）
 * Anthropic 协议参考：savor logs（192.168.5.250:3456）
 *
 * 请求体格式特点：
 * - OpenAI: messages 数组，每条消息有 role 和 content
 * - Anthropic: messages 数组，content 可能是字符串或 text block 数组
 */

const defaultConfig: CommandsConfig = {
  enabled: true,
  prefix: '\\'
};

describe('detectCommand - 基于真实请求体格式', () => {
  describe('OpenAI 协议（参考真实请求体）', () => {
    /**
     * OpenAI 协议请求体格式（简化版）：
     * {
     *   "model": "glm-5",
     *   "messages": [
     *     { "role": "system", "content": "You are a personal assistant..." },
     *     { "role": "user", "content": [{ "type": "text", "text": "[时间戳] 用户消息" }] },
     *     { "role": "assistant", "content": "回复内容" }
     *   ]
     * }
     */

    it('应检测到 OpenClaw 时间戳格式的 \\翻译 命令', () => {
      // 真实请求体格式：用户消息带有 Sender metadata 和时间戳
      const messages: ChatMessage[] = [
        { role: 'system', content: 'System prompt here.' },
        {
          role: 'user',
          content: `Sender (untrusted metadata):
{
  "label": "test-client",
  "id": "test-123"
}

[Sun 2026-04-12 10:20 GMT+8] \\翻译 Hello world`
        },
      ];
      const result = detectCommand(messages, defaultConfig);
      expect(result.detected).toBe(true);
      expect(result.command).toBe('翻译');
      expect(result.shouldTruncateContext).toBe(true);
      expect(result.maxRounds).toBe(0);
    });

    it('应检测到 OpenClaw 时间戳格式的 \\5 命令', () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'System prompt.' },
        {
          role: 'user',
          content: `[Sun 2026-04-12 10:21 GMT+8] \\5 测试消息`
        },
      ];
      const result = detectCommand(messages, defaultConfig);
      expect(result.detected).toBe(true);
      expect(result.command).toBe('裁切5');
      expect(result.shouldTruncateContext).toBe(true);
      expect(result.maxRounds).toBe(5);
    });

    it('应检测到 OpenClaw 时间戳格式的 \\0 命令', () => {
      const messages: ChatMessage[] = [
        {
          role: 'user',
          content: `[Sun 2026-04-12 10:21 GMT+8] \\0 只保留当前`
        },
      ];
      const result = detectCommand(messages, defaultConfig);
      expect(result.detected).toBe(true);
      expect(result.command).toBe('裁切0');
      expect(result.shouldTruncateContext).toBe(true);
      expect(result.maxRounds).toBe(0);
    });

    it('多轮对话场景：应检测最后一条用户消息中的命令', () => {
      // 真实多轮对话格式
      const messages: ChatMessage[] = [
        { role: 'system', content: 'System prompt.' },
        { role: 'user', content: '[Sun 2026-04-12 10:20 GMT+8] 测试' },
        { role: 'assistant', content: '收到，测试正常' },
        { role: 'user', content: '[Sun 2026-04-12 10:21 GMT+8] 测试2' },
        { role: 'assistant', content: '收到，测试2 正常' },
        { role: 'user', content: '[Sun 2026-04-12 10:22 GMT+8] \\3 最后一条' },
      ];
      const result = detectCommand(messages, defaultConfig);
      expect(result.detected).toBe(true);
      expect(result.command).toBe('裁切3');
      expect(result.maxRounds).toBe(3);
    });

    it('普通消息（无命令）不应触发裁切', () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'System prompt.' },
        { role: 'user', content: '[Sun 2026-04-12 10:20 GMT+8] 普通测试消息' },
      ];
      const result = detectCommand(messages, defaultConfig);
      expect(result.detected).toBe(false);
      expect(result.shouldTruncateContext).toBe(false);
    });

    it('数组格式 content 应正确解析', () => {
      // OpenAI 协议也支持数组格式的 content
      const messages: ChatMessage[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: '\\翻译 Test content' }
          ]
        },
      ];
      const result = detectCommand(messages, defaultConfig);
      expect(result.detected).toBe(true);
      expect(result.command).toBe('翻译');
    });
  });

  describe('Anthropic 协议（参考真实请求体）', () => {
    /**
     * Anthropic 协议请求体格式（简化版）：
     * {
     *   "model": "glm-5",
     *   "messages": [
     *     { "role": "user", "content": "字符串内容" },
     *     { "role": "user", "content": [{ "type": "text", "text": "text block" }] },
     *     { "role": "assistant", "content": [{ "type": "text", "text": "回复" }] }
     *   ],
     *   "system": [{ "type": "text", "text": "system prompt" }]
     * }
     *
     * 特点：
     * - 没有 system role 在 messages 中（system 是单独字段）
     * - content 可以是字符串或 text block 数组
     * - Claude Code 会把命令放在第二个 text block（第一个是 system-reminder）
     */

    it('应检测到字符串格式 content 中的 \\翻译 命令', () => {
      // Anthropic 简单字符串格式
      const messages: AnthropicMessage[] = [
        { role: 'user', content: '\\翻译 Translate this' },
      ];
      const result = detectCommand(messages, defaultConfig);
      expect(result.detected).toBe(true);
      expect(result.command).toBe('翻译');
      expect(result.shouldTruncateContext).toBe(true);
      expect(result.maxRounds).toBe(0);
    });

    it('应检测到单个 text block 中的 \\5 命令', () => {
      const messages: AnthropicMessage[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: '\\5 测试裁切' }
          ]
        },
      ];
      const result = detectCommand(messages, defaultConfig);
      expect(result.detected).toBe(true);
      expect(result.command).toBe('裁切5');
      expect(result.maxRounds).toBe(5);
    });

    it('Claude Code 场景：命令在第二个 text block 中', () => {
      // Claude Code 真实格式：第一个 block 是 system-reminder，第二个是用户命令
      const messages: AnthropicMessage[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: '<system-reminder>\nContext info here\n</system-reminder>\n' },
            { type: 'text', text: '\\8 测试' }
          ]
        },
      ];
      const result = detectCommand(messages, defaultConfig);
      expect(result.detected).toBe(true);
      expect(result.command).toBe('裁切8');
      expect(result.maxRounds).toBe(8);
    });

    it('Claude Code 场景：\\0 命令在第二个 text block', () => {
      const messages: AnthropicMessage[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Metadata or system-reminder content' },
            { type: 'text', text: '\\0 只保留当前' }
          ]
        },
      ];
      const result = detectCommand(messages, defaultConfig);
      expect(result.detected).toBe(true);
      expect(result.command).toBe('裁切0');
      expect(result.maxRounds).toBe(0);
    });

    it('Claude Code 场景：\\翻译 命令在第二个 text block', () => {
      const messages: AnthropicMessage[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: '<system-reminder>\nSome context\n</system-reminder>' },
            { type: 'text', text: '\\翻译 Translate this text' }
          ]
        },
      ];
      const result = detectCommand(messages, defaultConfig);
      expect(result.detected).toBe(true);
      expect(result.command).toBe('翻译');
      expect(result.shouldTruncateContext).toBe(true);
    });

    it('多轮对话：应检测最后一条用户消息', () => {
      const messages: AnthropicMessage[] = [
        { role: 'user', content: 'First message' },
        { role: 'assistant', content: [{ type: 'text', text: 'First response' }] },
        { role: 'user', content: 'Second message' },
        { role: 'assistant', content: [{ type: 'text', text: 'Second response' }] },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'System context' },
            { type: 'text', text: '\\10 最后一条消息' }
          ]
        },
      ];
      const result = detectCommand(messages, defaultConfig);
      expect(result.detected).toBe(true);
      expect(result.command).toBe('裁切10');
      expect(result.maxRounds).toBe(10);
    });

    it('混合 content 类型：应忽略非 text block', () => {
      const messages: AnthropicMessage[] = [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'url', url: 'https://example.com/img.png' } },
            { type: 'text', text: '\\3 带图片的消息' }
          ]
        },
      ];
      const result = detectCommand(messages, defaultConfig);
      expect(result.detected).toBe(true);
      expect(result.command).toBe('裁切3');
    });

    it('OpenClaw 时间戳格式在 Anthropic 中也应检测', () => {
      const messages: AnthropicMessage[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: '[Sun 2026-04-12 10:20 GMT+8] \\7 测试' }
          ]
        },
      ];
      const result = detectCommand(messages, defaultConfig);
      expect(result.detected).toBe(true);
      expect(result.command).toBe('裁切7');
    });
  });

  describe('边界情况', () => {
    it('空 messages 数组应返回未检测', () => {
      const result = detectCommand([], defaultConfig);
      expect(result.detected).toBe(false);
    });

    it('只有 assistant 消息应返回未检测', () => {
      const messages: ChatMessage[] = [
        { role: 'assistant', content: 'Only assistant message' },
      ];
      const result = detectCommand(messages, defaultConfig);
      expect(result.detected).toBe(false);
    });

    it('命令不在开头不应触发', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Please help me \\翻译 this' },
      ];
      const result = detectCommand(messages, defaultConfig);
      expect(result.detected).toBe(false);
    });

    it('命令系统禁用时应返回未检测', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: '\\翻译 Hello' },
      ];
      const disabledConfig = { enabled: false, prefix: '\\' };
      const result = detectCommand(messages, disabledConfig);
      expect(result.detected).toBe(false);
    });

    it('大数字命令应正确解析', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: '\\100 大数字测试' },
      ];
      const result = detectCommand(messages, defaultConfig);
      expect(result.detected).toBe(true);
      expect(result.maxRounds).toBe(100);
    });
  });
});