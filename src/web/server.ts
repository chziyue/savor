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
 * Savor - Web 监控看板服务
 */

import express from 'express';
import path from 'path';
import { getTodayStats, getRecentRequests, getRecentLogsSummary, getLogDetail, getLogRequestBody, getLogResponseBody, getOverallStats, getLast7DaysStats, getYesterdayStats } from '../utils/stats.js';
import { renderCyberDashboard } from './dashboard-new.js';
import { renderGlassDashboard } from './dashboard-glass.js';
import { renderLogsPage } from './logs-page.js';
import { renderLogsPageGlass } from './logs-page-glass.js';

// 缓存主题配置（启动时读取一次）
let cachedTheme: string = '';

/**
 * 获取配置中的主题设置（带缓存）
 */
function getThemeFromConfig(): string {
  if (cachedTheme) {
    return cachedTheme;
  }
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const config = require('../../config.js');
    cachedTheme = config?.dashboard?.theme || 'glass';
  } catch {
    cachedTheme = 'glass';
  }
  
  return cachedTheme;
}

/**
 * 清除主题缓存（配置变更时调用）
 */
export function clearThemeCache(): void {
  cachedTheme = '';
}

export function createWebServer(): express.Router {
  const router = express.Router();
  
  // 静态资源 - 使用 process.cwd() 作为基础路径
  router.use('/static', express.static(path.join(process.cwd(), 'public')));
  
  // API: 总体统计
  router.get('/api/stats/overall', (req, res) => {
    res.json(getOverallStats());
  });
  
  // API: 今日统计
  router.get('/api/stats/today', (req, res) => {
    res.json(getTodayStats());
  });
  
  // API: 昨日统计
  router.get('/api/stats/yesterday', (req, res) => {
    res.json(getYesterdayStats());
  });
  
  // API: 最近请求
  router.get('/api/stats/recent', (req, res) => {
    const limit = parseInt(req.query.limit as string) || 100;
    res.json(getRecentRequests(limit));
  });
  
  // API: 过去7天
  router.get('/api/stats/weekly', (req, res) => {
    res.json(getLast7DaysStats());
  });
  
  // API: 日志摘要（不包含详情）
  router.get('/api/logs/summary', (req, res) => {
    const limit = parseInt(req.query.limit as string) || 100;
    res.json(getRecentLogsSummary(limit));
  });
  
  // API: 单条日志详情
  router.get('/api/logs/:id', (req, res) => {
    const detail = getLogDetail(req.params.id);
    if (!detail) {
      return res.status(404).json({ error: 'Log not found' });
    }
    res.json(detail);
  });
  
  // API: 只获取请求体
  router.get('/api/logs/:id/request', (req, res) => {
    const requestBody = getLogRequestBody(req.params.id);
    if (requestBody === null) {
      return res.status(404).json({ error: 'Log not found' });
    }
    res.type('text/plain').send(requestBody);
  });
  
  // API: 只获取响应体
  router.get('/api/logs/:id/response', (req, res) => {
    const responseBody = getLogResponseBody(req.params.id);
    if (responseBody === null) {
      return res.status(404).json({ error: 'Log not found' });
    }
    res.type('text/plain').send(responseBody);
  });
  
  // 仪表盘页面（根路径）- 根据配置选择主题
  router.get('/', (req, res) => {
    const theme = getThemeFromConfig();
    if (theme === 'glass') {
      res.send(renderGlassDashboard());
    } else {
      res.send(renderCyberDashboard());
    }
  });
  
  // 日志页面 - 根据配置选择主题
  router.get('/logs', (req, res) => {
    const theme = getThemeFromConfig();
    if (theme === 'glass') {
      res.send(renderLogsPageGlass());
    } else {
      res.send(renderLogsPage());
    }
  });
  
  return router;
}
