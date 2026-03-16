/**
 * Savor - Web 监控看板服务
 */

import express from 'express';
import path from 'path';
import { getTodayStats, getRecentRequests, getRecentLogsSummary, getLogDetail, getLogRequestBody, getLogResponseBody, getOverallStats, getLast7DaysStats, getYesterdayStats } from '../utils/stats.js';
import { renderCyberDashboard } from './dashboard-new.js';
import { renderLogsPage } from './logs-page.js';

// 使用 process.cwd() 作为基础路径
const __dirname = process.cwd();

export function createWebServer(): express.Router {
  const router = express.Router();
  
  // 静态资源
  router.use('/static', express.static(path.join(__dirname, 'public')));
  
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
  
  // 仪表盘页面（根路径）
  router.get('/', (req, res) => {
    res.send(renderCyberDashboard());
  });
  
  // 日志页面
  router.get('/logs', (req, res) => {
    res.send(renderLogsPage());
  });
  
  return router;
}
