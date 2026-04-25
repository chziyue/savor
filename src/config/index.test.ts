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
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { startConfigWatcher, stopConfigWatcher } from './index.js';

// 测试用的临时配置文件路径
const testConfigDir = '/tmp/savor-config-test-' + Date.now();
const testConfigPath = path.join(testConfigDir, 'config.js');

describe('Config Hot Reload', () => {
  let originalCwd: () => string;

  beforeEach(() => {
    // 保存原始 process.cwd
    originalCwd = process.cwd;

    // 创建临时目录和配置文件
    if (!fs.existsSync(testConfigDir)) {
      fs.mkdirSync(testConfigDir, { recursive: true });
    }
    fs.writeFileSync(testConfigPath, `
module.exports = {
  upstream: 'https://api.test.com',
  upstreamSuffix: '/v1/chat/completions',
  port: 3456,
};
`);

    // 停止可能存在的监听器
    stopConfigWatcher();
  });

  afterEach(() => {
    // 停止监听器（先停止，再恢复 cwd）
    stopConfigWatcher();

    // 恢复 process.cwd
    process.cwd = originalCwd;

    // 清理临时目录
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  describe('startConfigWatcher', () => {
    it('should start watching config file', () => {
      process.cwd = () => testConfigDir;

      startConfigWatcher();
      stopConfigWatcher();

      // 应该成功启动和停止，不抛出错误
      expect(true).toBe(true);
    });

    it('should not crash when config.js does not exist', () => {
      process.cwd = () => '/nonexistent/path';

      // 应该静默处理，不抛出错误
      expect(() => startConfigWatcher()).not.toThrow();
    });
  });

  describe('fs.watch events', () => {
    it('should detect "change" event from direct write', async () => {
      process.cwd = () => testConfigDir;

      // 使用 Promise 来等待回调
      let callbackCalled = false;
      const callbackPromise = new Promise<void>((resolve) => {
        startConfigWatcher(() => {
          callbackCalled = true;
          resolve();
        });
      });

      // 等待 watcher 完全启动后再写入
      await new Promise(resolve => setTimeout(resolve, 500));

      // 直接写入（触发 change 事件）
      fs.writeFileSync(testConfigPath, `
module.exports = {
  upstream: 'https://api.new-test.com',
  upstreamSuffix: '/v1/chat/completions',
  port: 3456,
};
`);

      // 等待回调或超时（防抖 1秒 + 缓冲）
      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 2500);
      });

      await Promise.race([callbackPromise, timeoutPromise]);

      stopConfigWatcher();
      process.cwd = originalCwd;

      expect(callbackCalled).toBe(true);
    });

    it('should detect "rename" event from atomic write (vim/VS Code style)', async () => {
      process.cwd = () => testConfigDir;

      // 使用 Promise 来等待回调
      let callbackCalled = false;
      const callbackPromise = new Promise<void>((resolve) => {
        startConfigWatcher(() => {
          callbackCalled = true;
          resolve();
        });
      });

      // 等待 watcher 完全启动后再写入
      await new Promise(resolve => setTimeout(resolve, 500));

      // 模拟原子写入：先写临时文件，再重命名覆盖
      const tempFile = testConfigPath + '.tmp';
      fs.writeFileSync(tempFile, `
module.exports = {
  upstream: 'https://api.atomic-write.com',
  upstreamSuffix: '/v1/chat/completions',
  port: 3456,
};
`);
      fs.renameSync(tempFile, testConfigPath);

      // 等待回调或超时（防抖 1秒 + 缓冲）
      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 2500);
      });

      await Promise.race([callbackPromise, timeoutPromise]);

      stopConfigWatcher();
      process.cwd = originalCwd;

      expect(callbackCalled).toBe(true);
    });

    it('should debounce rapid changes', async () => {
      process.cwd = () => testConfigDir;

      // 使用计数器来跟踪回调次数
      let callCount = 0;
      const callbackPromise = new Promise<number>((resolve) => {
        startConfigWatcher(() => {
          callCount++;
          // 等待一段时间后 resolve，看是否还有更多回调
          setTimeout(() => resolve(callCount), 500);
        });
      });

      // 等待 watcher 完全启动后再写入
      await new Promise(resolve => setTimeout(resolve, 500));

      // 快速连续写入 3 次
      for (let i = 0; i < 3; i++) {
        fs.writeFileSync(testConfigPath, `
module.exports = {
  upstream: 'https://api.test${i}.com',
  upstreamSuffix: '/v1/chat/completions',
  port: 3456,
};
`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 等待防抖完成
      const timeoutPromise = new Promise<number>((resolve) => {
        setTimeout(() => resolve(callCount), 2500);
      });

      await Promise.race([callbackPromise, timeoutPromise]);

      stopConfigWatcher();
      process.cwd = originalCwd;

      // 应该只触发一次更新（防抖）
      expect(callCount).toBe(1);
    });
  });

  describe('stopConfigWatcher', () => {
    it('should stop watching config file', async () => {
      process.cwd = () => testConfigDir;

      let callbackCalled = false;
      startConfigWatcher(() => {
        callbackCalled = true;
      });
      stopConfigWatcher();

      // 停止后修改文件
      fs.writeFileSync(testConfigPath, `
module.exports = {
  upstream: 'https://api.after-stop.com',
  upstreamSuffix: '/v1/chat/completions',
  port: 3456,
};
`);

      await new Promise(resolve => setTimeout(resolve, 2000));

      // 不应该触发更新
      expect(callbackCalled).toBe(false);
    });

    it('should be safe to call multiple times', () => {
      expect(() => {
        stopConfigWatcher();
        stopConfigWatcher();
        stopConfigWatcher();
      }).not.toThrow();
    });
  });
});