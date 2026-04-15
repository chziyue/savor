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
 * Savor - 炫酷版监控看板
 * 设计风格：赛博朋克科技风
 */

import { getTodayStats, getYesterdayStats, getLast7DaysStats } from '../utils/stats.js';

export function renderCyberDashboard(): string {
  const stats = getYesterdayStats();
  const today = getTodayStats();
  const weekly = getLast7DaysStats();
  
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SAVOR // SYSTEM_MONITOR</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;500;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --neon-cyan: #00f5ff;
      --neon-pink: #ff00ff;
      --neon-purple: #b829dd;
      --dark-bg: #0a0a0f;
      --panel-bg: rgba(20, 20, 35, 0.8);
      --grid-color: rgba(0, 245, 255, 0.1);
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Rajdhani', sans-serif;
      background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%) fixed;
      color: #fff;
      min-height: 100vh;
      overflow-x: hidden;
    }
    
    /* 扫描线效果 - 使用vh避免拉长 */
    body::after {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(0, 245, 255, 0.03) 2px,
        rgba(0, 245, 255, 0.03) 4px
      );
      pointer-events: none;
      z-index: 1000;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 30px;
    }
    
    /* 头部 */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 40px;
      padding: 20px 0;
      border-bottom: 2px solid var(--neon-cyan);
      position: relative;
    }
    
    header::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      width: 30%;
      height: 2px;
      background: var(--neon-pink);
      box-shadow: 0 0 10px var(--neon-pink);
      animation: scanLine 3s ease-in-out infinite;
    }
    
    @keyframes scanLine {
      0%, 100% { left: 0; }
      50% { left: 70%; }
    }
    
    .logo {
      font-family: 'Orbitron', monospace;
      font-size: 2.5rem;
      font-weight: 900;
      background: linear-gradient(135deg, var(--neon-cyan), var(--neon-pink));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-transform: uppercase;
      letter-spacing: 4px;
      text-shadow: 0 0 30px rgba(0, 245, 255, 0.5);
    }
    
    .status-indicator {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.9rem;
      color: var(--neon-cyan);
    }
    
    .status-dot {
      width: 12px;
      height: 12px;
      background: var(--neon-cyan);
      border-radius: 50%;
      box-shadow: 0 0 10px var(--neon-cyan), 0 0 20px var(--neon-cyan);
      animation: pulse 2s ease-in-out infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(1.2); }
    }
    
    /* 核心指标卡片 */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 25px;
      margin-bottom: 40px;
    }
    
    .metric-card {
      background: var(--panel-bg);
      border: 1px solid rgba(0, 245, 255, 0.3);
      border-radius: 15px;
      padding: 30px;
      position: relative;
      overflow: hidden;
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
    }
    
    .metric-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(0, 245, 255, 0.1),
        transparent
      );
      transition: left 0.5s;
    }
    
    .metric-card:hover::before {
      left: 100%;
    }
    
    .metric-card:hover {
      border-color: var(--neon-cyan);
      box-shadow: 0 0 30px rgba(0, 245, 255, 0.2);
      transform: translateY(-5px);
    }
    
    .metric-label {
      font-size: 0.85rem;
      color: rgba(255, 255, 255, 0.6);
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 10px;
      text-align: center;
    }
    
    .metric-value {
      font-family: 'Orbitron', monospace;
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--neon-cyan);
      text-shadow: 0 0 20px rgba(0, 245, 255, 0.5);
      text-align: center;
    }
    
    .metric-value.success { color: #00ff88; text-shadow: 0 0 20px rgba(0, 255, 136, 0.5); }
    .metric-value.warning { color: #ffaa00; text-shadow: 0 0 20px rgba(255, 170, 0, 0.5); }
    .metric-value.danger { color: var(--neon-pink); text-shadow: 0 0 20px rgba(255, 0, 255, 0.5); }
    
    /* 图表区域 */
    .chart-section {
      background: var(--panel-bg);
      border: 1px solid rgba(0, 245, 255, 0.2);
      border-radius: 15px;
      padding: 30px;
      margin-bottom: 30px;
      backdrop-filter: blur(10px);
    }
    
    .chart-container {
      position: relative;
      height: 300px;
    }
    
    .section-title {
      font-family: 'Orbitron', monospace;
      font-size: 1.2rem;
      color: var(--neon-cyan);
      margin-bottom: 20px;
      text-transform: uppercase;
      letter-spacing: 2px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .section-title::before {
      content: '//';
      color: var(--neon-pink);
    }
    
    /* 实时日志 */
    .log-container {
      background: rgba(0, 0, 0, 0.5);
      border-radius: 10px;
      padding: 20px;
      max-height: 400px;
      overflow-y: auto;
      font-family: 'Courier New', monospace;
      font-size: 0.85rem;
    }
    
    .log-entry {
      padding: 8px 0;
      border-bottom: 1px solid rgba(0, 245, 255, 0.1);
      display: flex;
      align-items: center;
      gap: 15px;
      line-height: 1.5;
    }
    
    .log-entry span {
      line-height: 1;
    }
    
    .log-time {
      color: var(--neon-purple);
      min-width: 80px;
    }
    
    .log-status {
      min-width: 60px;
    }
    
    .log-status.success { color: #00ff88; }
    .log-status.error { color: var(--neon-pink); }
    
    /* 按钮 */
    .btn {
      background: transparent;
      border: 2px solid var(--neon-cyan);
      color: var(--neon-cyan);
      padding: 12px 30px;
      font-family: 'Orbitron', monospace;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 2px;
      cursor: pointer;
      transition: all 0.3s;
      position: relative;
      overflow: hidden;
    }
    
    .btn::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: var(--neon-cyan);
      transition: left 0.3s;
      z-index: -1;
    }
    
    .btn:hover {
      color: var(--dark-bg);
    }
    
    .btn:hover::before {
      left: 0;
    }
    
    /* 滚动条 */
    ::-webkit-scrollbar {
      width: 8px;
    }
    
    ::-webkit-scrollbar-track {
      background: var(--dark-bg);
    }
    
    ::-webkit-scrollbar-thumb {
      background: var(--neon-cyan);
      border-radius: 4px;
    }
    
    /* 响应式 */
    @media (max-width: 768px) {
      .logo { font-size: 1.5rem; }
      .metric-value { font-size: 1.8rem; }
      .container { padding: 15px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo">SAVOR 监控中心</div>
      <a href="/logs" class="status-indicator" style="text-decoration: none; align-items: flex-end; padding-bottom: 5px;">
        <span>监控日志</span>
      </a>
    </header>
    
    <!-- 今日统计 (第3-4行) -->
    <div class="chart-section">
      <div class="section-title">TODAY STATISTICS // ${today.date}</div>
      <!-- 第3行: 核心指标 -->
      <div class="metrics-grid" style="margin-bottom: 20px;">
        <div class="metric-card">
          <div class="metric-label">请求数</div>
          <div class="metric-value" id="todayRequests">${today.totalRequests}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Token</div>
          <div class="metric-value" id="todayTokens">${Math.round(today.totalTokens / 1000)}k</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">输入 Token</div>
          <div class="metric-value warning" id="todayCompletionTokens">${Math.round(today.totalPromptTokens / 1000)}k</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">输出 Token</div>
          <div class="metric-value warning" id="todayPromptTokens">${Math.round(today.totalCompletionTokens / 1000)}k</div>
        </div>
      </div>
      <!-- 第4行: 实时指标 -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">隐私过滤</div>
          <div class="metric-value success" id="todayPrivacyFiltered">${today.privacyFiltered || 0}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">上下文裁切</div>
          <div class="metric-value success" id="todayContextTruncated">${today.contextTruncated || 0}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">已节省 Token</div>
          <div class="metric-value danger" id="todaySavedTokens">-</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">平均耗时</div>
          <div class="metric-value" id="avgResponseTime">${today.avgDuration || 0}ms</div>
        </div>
      </div>
    </div>
    
    <!-- 总计统计 (第1-2行) -->
    <div class="chart-section">
      <div class="section-title">YESTERDAY STATISTICS // ${stats.date}</div>
      <!-- 第1行: 核心指标 -->
      <div class="metrics-grid" style="margin-bottom: 20px;">
        <div class="metric-card">
          <div class="metric-label">请求数</div>
          <div class="metric-value" id="totalRequests">${stats.totalRequests}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Token</div>
          <div class="metric-value" id="totalTokens">${Math.round(stats.totalTokens / 1000)}k</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">输入 Token</div>
          <div class="metric-value warning" id="totalCompletionTokens">${Math.round(stats.totalPromptTokens / 1000)}k</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">输出 Token</div>
          <div class="metric-value warning" id="totalPromptTokens">${Math.round(stats.totalCompletionTokens / 1000)}k</div>
        </div>
      </div>
      <!-- 第2行: 效率指标 -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">隐私过滤</div>
          <div class="metric-value success" id="totalPrivacyFiltered">${stats.privacyFiltered || 0}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">上下文裁切</div>
          <div class="metric-value success" id="totalContextTruncated">${stats.contextTruncated || 0}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">已节省 Token</div>
          <div class="metric-value danger" id="totalSavedTokens">-</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">平均耗时</div>
          <div class="metric-value" id="totalAvgResponseTime">${stats.avgResponseTime || 0}ms</div>
        </div>
      </div>
    </div>

    <!-- 7天请求趋势图 -->
    <div class="chart-section">
      <div class="section-title">7天请求趋势分析</div>
      <div class="chart-container">
        <canvas id="requestsChart"></canvas>
      </div>
    </div>

    <!-- 7天Token趋势图 -->
    <div class="chart-section">
      <div class="section-title">7天Token趋势分析</div>
      <div class="chart-container">
        <canvas id="tokensChart"></canvas>
      </div>
    </div>
    
    <!-- 实时日志 -->
    <div class="chart-section">
      <div class="section-title">实时请求日志</div>
      <div class="log-container" id="logContainer">
        <div style="color: var(--neon-cyan);">正在加载数据...</div>
      </div>
    </div>
  </div>
  
  <script>
    // 7天趋势数据
    const weeklyData = ${JSON.stringify(weekly)};
    // 7天请求趋势图（只显示请求数据）
    const requestsCtx = document.getElementById('requestsChart').getContext('2d');
    const requestsGradient = requestsCtx.createLinearGradient(0, 0, 0, 400);
    requestsGradient.addColorStop(0, 'rgba(0, 245, 255, 0.5)');
    requestsGradient.addColorStop(1, 'rgba(0, 245, 255, 0)');

    const requestsChart = new Chart(requestsCtx, {
      type: 'line',
      data: {
        labels: weeklyData.map(d => d.date.slice(5)),
        datasets: [{
          label: 'Requests',
          data: weeklyData.map(d => d.totalRequests),
          borderColor: '#00f5ff',
          backgroundColor: requestsGradient,
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointBackgroundColor: '#00f5ff',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            labels: {
              color: '#fff',
              font: { family: 'Orbitron', size: 12 }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(0, 245, 255, 0.1)' },
            ticks: { color: 'rgba(255, 255, 255, 0.7)', font: { family: 'Rajdhani' } }
          },
          y: {
            grid: { color: 'rgba(0, 245, 255, 0.1)' },
            ticks: { color: 'rgba(255, 255, 255, 0.7)', font: { family: 'Rajdhani' } }
          }
        }
      }
    });

    // 7天Token趋势图（只显示Token数据）
    const tokensCtx = document.getElementById('tokensChart').getContext('2d');
    const tokensGradient = tokensCtx.createLinearGradient(0, 0, 0, 400);
    tokensGradient.addColorStop(0, 'rgba(255, 0, 255, 0.5)');
    tokensGradient.addColorStop(1, 'rgba(255, 0, 255, 0)');

    const tokensChart = new Chart(tokensCtx, {
      type: 'line',
      data: {
        labels: weeklyData.map(d => d.date.slice(5)),
        datasets: [{
          label: 'Tokens (k)',
          data: weeklyData.map(d => Math.round(d.totalTokens / 1000)),
          borderColor: '#ff00ff',
          backgroundColor: tokensGradient,
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointBackgroundColor: '#ff00ff',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            labels: {
              color: '#fff',
              font: { family: 'Orbitron', size: 12 }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(0, 245, 255, 0.1)' },
            ticks: { color: 'rgba(255, 255, 255, 0.7)', font: { family: 'Rajdhani' } }
          },
          y: {
            grid: { color: 'rgba(0, 245, 255, 0.1)' },
            ticks: { color: 'rgba(255, 255, 255, 0.7)', font: { family: 'Rajdhani' } }
          }
        }
      }
    });

    // 加载统计数据
    
    // 加载昨日统计（只加载一次）
    async function loadYesterdayStats() {
      try {
        const yesterdayRes = await fetch('/api/stats/yesterday');
        const yesterday = await yesterdayRes.json();
        document.getElementById('totalRequests').textContent = yesterday.totalRequests;
        document.getElementById('totalTokens').textContent = Math.round(yesterday.totalTokens / 1000) + 'k';
        // 输出 Token 数（completionTokens）和输入 Token 数（promptTokens）
        document.getElementById('totalPromptTokens').textContent = Math.round(yesterday.totalCompletionTokens / 1000) + 'k';
        document.getElementById('totalCompletionTokens').textContent = Math.round(yesterday.totalPromptTokens / 1000) + 'k';
        
        // 昨日统计 - 第2行（隐私过滤和上下文裁切相关）
        const totalPrivacyFilteredEl = document.getElementById('totalPrivacyFiltered');
        const totalContextTruncatedEl = document.getElementById('totalContextTruncated');
        const totalSavedTokensEl = document.getElementById('totalSavedTokens');
        const totalAvgResponseTimeEl = document.getElementById('totalAvgResponseTime');
        
        // 隐私过滤次数：后端返回的数据
        if (totalPrivacyFilteredEl) totalPrivacyFilteredEl.textContent = yesterday.privacyFiltered || 0;
        // 上下文裁切次数：后端返回的数据
        if (totalContextTruncatedEl) totalContextTruncatedEl.textContent = yesterday.contextTruncated || 0;
        // 节省 Token 数：后端返回的数据
        if (totalSavedTokensEl) totalSavedTokensEl.textContent = Math.round((yesterday.savedTokens || 0) / 1000) + 'k';
        if (totalAvgResponseTimeEl) totalAvgResponseTimeEl.textContent = (yesterday.avgDuration || 0) + 'ms';
      } catch (e) {
        console.error('Failed to load yesterday stats:', e);
      }
    }
    
    // 加载今日统计和7天趋势（每5秒刷新）
    async function loadTodayStats() {
      try {
        // 今日统计（重新渲染卡片）
        const todayRes = await fetch('/api/stats/today');
        const today = await todayRes.json();
        updateTodayStats(today);
        
        // 更新 7 天趋势图
        updateWeeklyCharts(today.weekly || weeklyData);
      } catch (e) {
        console.error('Failed to load today stats:', e);
      }
    }
    
    // 更新 7 天趋势图表
    function updateWeeklyCharts(data) {
      if (requestsChart && tokensChart) {
        requestsChart.data.labels = data.map(d => d.date.slice(5));
        requestsChart.data.datasets[0].data = data.map(d => d.totalRequests);
        requestsChart.update();
        
        tokensChart.data.labels = data.map(d => d.date.slice(5));
        tokensChart.data.datasets[0].data = data.map(d => Math.round(d.totalTokens / 1000));
        tokensChart.update();
      }
    }
    
    // 更新今日统计卡片
    function updateTodayStats(today) {
      // 使用 ID 选择器更新今日统计数据
      const todayRequestsEl = document.getElementById('todayRequests');
      const todayActualRequestsEl = document.getElementById('todayActualRequests');
      const todayTokensEl = document.getElementById('todayTokens');
      const todayActualTokensEl = document.getElementById('todayActualTokens');
      const todaySavedTokensEl = document.getElementById('todaySavedTokens');
      
      if (todayRequestsEl) todayRequestsEl.textContent = today.totalRequests;
      if (todayTokensEl) todayTokensEl.textContent = Math.round(today.totalTokens / 1000) + 'k';
      // 输出 Token 数（completionTokens）和输入 Token 数（promptTokens）
      const todayPromptTokensEl = document.getElementById('todayPromptTokens');
      const todayCompletionTokensEl = document.getElementById('todayCompletionTokens');
      if (todayPromptTokensEl) todayPromptTokensEl.textContent = Math.round(today.totalCompletionTokens / 1000) + 'k';
      if (todayCompletionTokensEl) todayCompletionTokensEl.textContent = Math.round(today.totalPromptTokens / 1000) + 'k';
      // 上下文裁切次数：后端返回的数据
      const todayContextTruncatedEl = document.getElementById('todayContextTruncated');
      if (todayContextTruncatedEl) todayContextTruncatedEl.textContent = today.contextTruncated || 0;
      // 节省 Token 数：上下文裁切节省的 Token
      const todaySavedTokensCalc = today.savedTokens || 0;
      if (todaySavedTokensEl) todaySavedTokensEl.textContent = Math.round(todaySavedTokensCalc / 1000) + 'k';
      // 平均响应时间
      const todayAvgResponseTimeEl = document.getElementById('avgResponseTime');
      if (todayAvgResponseTimeEl) todayAvgResponseTimeEl.textContent = (today.avgDuration || 0) + 'ms';
      // 隐私过滤次数
      const todayPrivacyFilteredEl = document.getElementById('todayPrivacyFiltered');
      if (todayPrivacyFilteredEl) todayPrivacyFilteredEl.textContent = today.privacyFiltered || 0;
    }
    
    // 加载实时日志
    async function loadLogs() {
      try {
        const res = await fetch('/api/stats/recent?limit=20');
        const requests = await res.json();
        const container = document.getElementById('logContainer');
        
        container.innerHTML = requests.map(r => {
          // 生成过滤标记
          var filterMarkersHtml = '';
          if (r.filterMarkers && r.filterMarkers.length > 0) {
            filterMarkersHtml = r.filterMarkers.map(function(marker) {
              var text = marker.trim();
              return '<span style="background: rgba(0, 255, 136, 0.2); color: #00ff88; padding: 2px 8px; border-radius: 3px; font-size: 0.7rem; margin-left: 8px; text-transform: uppercase;">' + text + '</span>';
            }).join('');
          }
          return \`
          <div class="log-entry">
            <span class="log-time">\${new Date(r.timestamp).toLocaleTimeString('zh-CN', {hour12: false})}</span>
            <span class="log-status \${r.status}">[\${r.status.toUpperCase()}]</span>
            <span style="color: #00f5ff;">\${r.model}</span>
            \${filterMarkersHtml}
            <span style="color: rgba(255,255,255,0.6);">Tokens: \${r.promptTokens} + \${r.completionTokens} = \${r.totalTokens}</span>
            <span style="color: #ff00ff;">⏱️ \${r.duration}ms</span>
          </div>
        \`;
        }).join('');
      } catch (e) {
        console.error('Failed to load logs:', e);
      }
    }
    
    // 初始加载（昨日统计只加载一次）
    loadYesterdayStats();
    loadTodayStats();
    loadLogs();
    
    // 定时刷新（每5秒）- 只刷新今日统计和日志
    setInterval(loadTodayStats, 5000);
    setInterval(loadLogs, 5000);
  </script>
</body>
</html>`;
}