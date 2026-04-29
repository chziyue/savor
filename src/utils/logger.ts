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
 * Savor - 日志模块
 * 使用 Pino 实现高性能结构化日志
 * 兼容 Winston API 格式
 */

import pino from 'pino';
import path from 'path';
import fs from 'fs';

// 日志目录
const LOG_DIR = process.env.LOG_DIR || './logs';

// 确保日志目录存在
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// 获取日志级别
const logLevel = process.env.LOG_LEVEL || 'info';

// 是否开发环境（使用美化输出）
const isDev = process.env.NODE_ENV !== 'production';

// 日志文件路径
const accessLogPath = path.join(LOG_DIR, 'access.log');
const errorLogPath = path.join(LOG_DIR, 'error.log');

// 创建控制台 Logger
const consoleLogger = pino({
  level: logLevel,
  base: { service: 'savor' },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: isDev ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:YYYY-MM-DD HH:mm:ss',
      ignore: 'pid,hostname',
    },
  } : undefined,
});

// 创建文件写入流
const accessStream = fs.createWriteStream(accessLogPath, { flags: 'a' });
const errorStream = fs.createWriteStream(errorLogPath, { flags: 'a' });

// 监听流错误，避免未处理的 error 事件导致进程崩溃
accessStream.on('error', (err) => {
  console.error('[Logger] access.log 写入错误:', err.message);
});
errorStream.on('error', (err) => {
  console.error('[Logger] error.log 写入错误:', err.message);
});

/**
 * 兼容 Winston API 的 Logger
 * Winston: logger.info(message, meta)
 * Pino: logger.info(meta, message)
 */
export const logger = {
  info: (message: string, meta?: object) => {
    const metaObj = meta || {};
    // 控制台
    consoleLogger.info(metaObj, message);
    // 文件（JSON 格式）
    const logLine = JSON.stringify({
      level: 'info',
      time: new Date().toISOString(),
      service: 'savor',
      msg: message,
      ...metaObj
    }) + '\n';
    accessStream.write(logLine);
  },
  
  warn: (message: string, meta?: object) => {
    const metaObj = meta || {};
    consoleLogger.warn(metaObj, message);
    // 写入 access 日志文件（warn 级别同样重要）
    const logLine = JSON.stringify({
      level: 'warn',
      time: new Date().toISOString(),
      service: 'savor',
      msg: message,
      ...metaObj
    }) + '\n';
    accessStream.write(logLine);
  },
  
  error: (message: string, meta?: object) => {
    const metaObj = meta || {};
    // 控制台
    consoleLogger.error(metaObj, message);
    // 错误日志文件
    const logLine = JSON.stringify({
      level: 'error',
      time: new Date().toISOString(),
      service: 'savor',
      msg: message,
      ...metaObj
    }) + '\n';
    errorStream.write(logLine);
  },
  
  debug: (message: string, meta?: object) => {
    consoleLogger.debug(meta || {}, message);
  },
  
  trace: (message: string, meta?: object) => {
    consoleLogger.trace(meta || {}, message);
  },
  
  fatal: (message: string, meta?: object) => {
    const metaObj = meta || {};
    consoleLogger.fatal(metaObj, message);
    const logLine = JSON.stringify({
      level: 'fatal',
      time: new Date().toISOString(),
      service: 'savor',
      msg: message,
      ...metaObj
    }) + '\n';
    errorStream.write(logLine);
  },
};

// 简化接口（兼容原有代码）
export const logInfo = (message: string, meta?: object) => {
  logger.info(message, meta);
};

export const logError = (message: string, meta?: object) => {
  logger.error(message, meta);
};

export const logDebug = (message: string, meta?: object) => {
  logger.debug(message, meta);
};

export const logWarn = (message: string, meta?: object) => {
  logger.warn(message, meta);
};

/**
 * 更新日志级别（热更新）
 */
export function updateLogLevel(level: string): void {
  consoleLogger.level = level;
  consoleLogger.info(`[Logger] 日志级别已更新为: ${level}`);
}