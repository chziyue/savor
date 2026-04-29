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
 * Savor - Glass 毛玻璃风格看板
 * 设计风格：Apple 设计语言 + 现代毛玻璃风格
 */

import { getTodayStats, getYesterdayStats, getLast7DaysStats } from '../utils/stats.js';

export function renderGlassDashboard(): string {
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
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      /* 背景 */
      --bg-primary: #ffffff;
      --bg-secondary: #f5f5f7;
      --bg-card: rgba(255, 255, 255, 0.7);
      --bg-card-hover: rgba(255, 255, 255, 0.88);
      --bg-gradient: linear-gradient(180deg, #f5f5f7 0%, #ffffff 50%, #f0f0f5 100%);
      --orb-blue: radial-gradient(circle, rgba(0, 122, 255, 0.15) 0%, transparent 70%);
      --orb-purple: radial-gradient(circle, rgba(175, 82, 222, 0.12) 0%, transparent 70%);
      --orb-green: radial-gradient(circle, rgba(52, 199, 89, 0.09) 0%, transparent 70%);
      
      /* 文字 */
      --text-primary: rgb(28, 28, 30);
      --text-secondary: rgb(58, 58, 60);
      --text-tertiary: rgb(108, 108, 112);
      --text-inverse: #ffffff;
      
      /* 强调色 */
      --accent-primary: rgb(0, 122, 255);
      --accent-primary-bg: rgba(0, 122, 255, 0.1);
      --accent-secondary: rgb(175, 82, 222);
      --accent-tertiary: rgb(50, 173, 230);
      
      /* 功能色 */
      --color-success: rgb(52, 199, 89);
      --color-success-bg: rgba(52, 199, 89, 0.1);
      --color-warning: rgb(255, 149, 0);
      --color-warning-bg: rgba(255, 149, 0, 0.1);
      --color-error: rgb(255, 45, 85);
      --color-error-bg: rgba(255, 45, 85, 0.1);
      
      /* 边框 */
      --border-default: rgba(255, 255, 255, 0.9);
      --border-subtle: rgba(116, 116, 128, 0.1);
      
      /* 阴影 */
      --shadow-md: rgba(0, 0, 0, 0.06) 0px 2px 8px;
      --shadow-lg: rgba(0, 0, 0, 0.06) 0px 2px 16px;
      --shadow-inset: rgba(255, 255, 255, 0.95) 0px 1px 0px inset;
      
      /* 毛玻璃 */
      --glass-bg: rgba(255, 255, 255, 0.55);
      --glass-blur: 28px;
      
      /* 按钮 */
      --btn-bg: rgba(255, 255, 255, 0.7);
      --btn-border: rgba(255, 255, 255, 0.9);
      --btn-text: rgb(142, 142, 147);
      --btn-hover-bg: rgba(255, 255, 255, 0.9);
      --btn-hover-text: rgb(28, 28, 30);
      
      /* 圆角 */
      --radius-full: 980px;
      --radius-card: 20px;
      --radius-card-sm: 14px;
    }
    
    /* 深色模式 */
    [data-theme="dark"] {
      --bg-primary: #0a0a0f;
      --bg-secondary: #1a1a2e;
      --bg-card: rgba(20, 20, 35, 0.8);
      --bg-card-hover: rgba(30, 30, 50, 0.9);
      --bg-gradient: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%);
      --orb-blue: radial-gradient(circle, rgba(0, 245, 255, 0.15) 0%, transparent 70%);
      --orb-purple: radial-gradient(circle, rgba(255, 0, 255, 0.1) 0%, transparent 70%);
      --orb-green: radial-gradient(circle, rgba(52, 199, 89, 0.09) 0%, transparent 70%);
      
      --text-primary: #ffffff;
      --text-secondary: rgba(255, 255, 255, 0.7);
      --text-tertiary: rgba(255, 255, 255, 0.5);
      --text-inverse: #0a0a0f;
      
      --accent-primary: #00f5ff;
      --accent-primary-bg: rgba(0, 245, 255, 0.1);
      --accent-secondary: #ff00ff;
      --accent-tertiary: #b829dd;
      
      --color-success: #00ff88;
      --color-success-bg: rgba(0, 255, 136, 0.1);
      --color-warning: #ffaa00;
      --color-warning-bg: rgba(255, 170, 0, 0.1);
      --color-error: #ff00ff;
      --color-error-bg: rgba(255, 0, 255, 0.1);
      
      --border-default: rgba(0, 245, 255, 0.3);
      --border-subtle: rgba(0, 245, 255, 0.1);
      
      --shadow-md: rgba(0, 245, 255, 0.05) 0px 2px 8px;
      --shadow-lg: rgba(0, 245, 255, 0.1) 0px 2px 16px;
      --shadow-inset: rgba(0, 245, 255, 0.1) 0px 1px 0px inset;
      
      --glass-bg: rgba(20, 20, 35, 0.8);
      
      --btn-bg: rgba(0, 245, 255, 0.1);
      --btn-border: rgba(0, 245, 255, 0.3);
      --btn-text: rgba(0, 245, 255, 0.7);
      --btn-hover-bg: rgba(0, 245, 255, 0.2);
      --btn-hover-text: #00f5ff;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    html {
      scroll-behavior: smooth;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg-gradient) fixed;
      color: var(--text-primary);
      min-height: 100vh;
      overflow-x: hidden;
      overflow-y: scroll;
      position: relative;
      transition: background 0.5s ease, color 0.3s ease;
    }
    
    /* 光晕装饰 */
    .orb {
      position: fixed;
      border-radius: 50%;
      filter: blur(60px);
      pointer-events: none;
      z-index: 0;
      transition: all 0.5s ease;
    }
    
    .orb-blue {
      width: 660px;
      height: 660px;
      left: -10%;
      top: -10%;
      background: var(--orb-blue);
    }
    
    .orb-purple {
      width: 500px;
      height: 500px;
      right: -5%;
      top: -5%;
      background: var(--orb-purple);
    }
    
    .orb-green {
      width: 600px;
      height: 600px;
      left: 50%;
      bottom: 0;
      transform: translateX(-50%);
      background: var(--orb-green);
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 30px;
      position: relative;
      z-index: 1;
    }
    
    /* 头部 */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 40px;
      padding: 20px 0;
      border-bottom: 2px solid var(--border-subtle);
    }
    
    .logo {
      font-size: 2rem;
      font-weight: 700;
      line-height: 1.2;
      background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: 2px;
    }
    
    .status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      height: 36px;
      background: var(--btn-bg);
      backdrop-filter: blur(12px);
      border: 1px solid var(--btn-border);
      border-radius: var(--radius-full);
      box-shadow: var(--shadow-md), var(--shadow-inset);
      font-size: 14px;
      font-weight: 500;
      color: var(--btn-text);
      text-decoration: none;
      transition: 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      letter-spacing: -0.01em;
      box-sizing: border-box;
    }
    
    .status-indicator:hover {
      background: var(--btn-hover-bg);
      color: var(--btn-hover-text);
      transform: scale(1.02);
    }
    
    .status-dot {
      width: 8px;
      height: 8px;
      background: var(--color-success);
      border-radius: 50%;
      animation: pulse 2s ease-in-out infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(1.1); }
    }
    
    /* 主题切换按钮 */
    .theme-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      padding: 0;
      background: var(--btn-bg);
      backdrop-filter: blur(12px);
      border: 1px solid var(--btn-border);
      border-radius: 50%;
      box-shadow: var(--shadow-md), var(--shadow-inset);
      color: var(--btn-text);
      font-size: 18px;
      cursor: pointer;
      transition: 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      margin-left: 10px;
    }
    
    .theme-toggle:hover {
      background: var(--btn-hover-bg);
      color: var(--btn-hover-text);
      transform: scale(1.05);
    }
    
    .header-actions {
      display: flex;
      align-items: center;
      height: 36px;
    }
    
    /* 核心指标卡片 */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .metric-card {
      background: var(--bg-card);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-card);
      padding: 28px;
      position: relative;
      overflow: hidden;
      backdrop-filter: blur(var(--glass-blur)) saturate(180%);
      box-shadow: var(--shadow-lg), var(--shadow-inset);
      transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
    }
    
    .metric-card:hover {
      box-shadow: var(--shadow-lg), 0 0 40px var(--accent-primary-bg);
      transform: translateY(-3px);
      background: var(--bg-card-hover);
    }
    
    .metric-label {
      font-size: 0.85rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 12px;
      text-align: center;
      font-weight: 500;
    }
    
    .metric-value {
      font-size: 2.2rem;
      font-weight: 700;
      color: var(--accent-primary);
      text-align: center;
    }
    
    .metric-value.success { color: var(--color-success); }
    .metric-value.warning { color: var(--color-warning); }
    .metric-value.danger { color: var(--accent-secondary); }
    
    /* 图表区域 */
    .chart-section {
      background: var(--bg-card);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-card);
      padding: 28px;
      margin-bottom: 24px;
      backdrop-filter: blur(var(--glass-blur)) saturate(180%);
      box-shadow: var(--shadow-md), var(--shadow-inset);
    }
    
    .chart-container {
      position: relative;
      height: 300px;
    }
    
    .section-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 20px;
      letter-spacing: 1px;
    }
    
    /* 实时日志 */
    .log-container {
      background: var(--bg-secondary);
      border-radius: var(--radius-card-sm);
      padding: 20px;
      max-height: 400px;
      overflow-y: auto;
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 0.85rem;
    }
    
    .log-entry {
      padding: 10px 0;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      gap: 15px;
      line-height: 1.5;
    }
    
    .log-entry span {
      line-height: 1;
    }
    
    .log-time {
      color: var(--accent-tertiary);
      min-width: 80px;
      font-weight: 500;
    }
    
    .log-status {
      min-width: 60px;
      font-weight: 600;
    }
    
    .log-model {
      color: var(--accent-primary);
      font-weight: 500;
    }
    
    .log-tokens {
      color: var(--text-secondary);
    }
    
    .log-duration {
      color: var(--accent-secondary);
      font-weight: 500;
    }
    
    .log-status.success { color: var(--color-success); }
    .log-status.error { color: var(--color-error); }
    
    /* 按钮 */
    .btn {
      background: var(--btn-bg);
      backdrop-filter: blur(12px);
      border: 1px solid var(--btn-border);
      border-radius: var(--radius-full);
      box-shadow: var(--shadow-md), var(--shadow-inset);
      color: var(--btn-text);
      padding: 8px 16px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      letter-spacing: -0.01em;
    }
    
    .btn:hover {
      background: var(--btn-hover-bg);
      color: var(--btn-hover-text);
      transform: scale(1.02);
    }
    
    /* 滚动条 */
    ::-webkit-scrollbar {
      width: 6px;
    }
    
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    
    ::-webkit-scrollbar-thumb {
      background: rgba(116, 116, 128, 0.3);
      border-radius: 3px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(116, 116, 128, 0.5);
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
  <div class="orb orb-blue"></div>
  <div class="orb orb-purple"></div>
  <div class="orb orb-green"></div>
  
  <div class="container">
    <header>
      <div class="logo">SAVOR 监控中心</div>
      <div class="header-actions">
        <a href="/logs" class="status-indicator">
          <span class="status-dot"></span>
          <span>监控日志</span>
        </a>
        <button class="theme-toggle" onclick="toggleTheme()" title="切换主题">
          <span id="theme-icon">🌙</span>
        </button>
      </div>
    </header>
    
    <!-- 今日统计 -->
    <div class="chart-section">
      <div class="section-title">今日统计 // ${today.date}</div>
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
    
    <!-- 昨日统计 -->
    <div class="chart-section">
      <div class="section-title">昨日统计 // ${stats.date}</div>
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
        <div style="color: var(--accent-primary);">正在加载数据...</div>
      </div>
    </div>
  </div>
  
  <script>
    // 主题切换功能
    function initTheme() {
      const savedTheme = localStorage.getItem('savor-theme') || 'light';
      document.documentElement.setAttribute('data-theme', savedTheme);
      updateThemeIcon(savedTheme);
    }
    
    function toggleTheme() {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('savor-theme', newTheme);
      updateThemeIcon(newTheme);
      updateChartsTheme(newTheme);
    }
    
    function updateThemeIcon(theme) {
      const icon = document.getElementById('theme-icon');
      if (icon) {
        icon.textContent = theme === 'light' ? '🌙' : '☀️';
      }
    }
    
    function updateChartsTheme(theme) {
      const isDark = theme === 'dark';
      const textColor = isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.6)';
      const gridColor = isDark ? 'rgba(0, 245, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)';
      const primaryColor = isDark ? '#00f5ff' : 'rgb(0, 122, 255)';
      const secondaryColor = isDark ? '#ff00ff' : 'rgb(175, 82, 222)';
      const legendColor = isDark ? '#ffffff' : 'rgb(28, 28, 30)';
      
      if (window.requestsChart) {
        window.requestsChart.data.datasets[0].borderColor = primaryColor;
        window.requestsChart.data.datasets[0].pointBackgroundColor = primaryColor;
        window.requestsChart.options.scales.x.grid.color = gridColor;
        window.requestsChart.options.scales.y.grid.color = gridColor;
        window.requestsChart.options.scales.x.ticks.color = textColor;
        window.requestsChart.options.scales.y.ticks.color = textColor;
        window.requestsChart.options.plugins.legend.labels.color = legendColor;
        window.requestsChart.update();
      }
      
      if (window.tokensChart) {
        window.tokensChart.data.datasets[0].borderColor = secondaryColor;
        window.tokensChart.data.datasets[0].pointBackgroundColor = secondaryColor;
        window.tokensChart.options.scales.x.grid.color = gridColor;
        window.tokensChart.options.scales.y.grid.color = gridColor;
        window.tokensChart.options.scales.x.ticks.color = textColor;
        window.tokensChart.options.scales.y.ticks.color = textColor;
        window.tokensChart.options.plugins.legend.labels.color = legendColor;
        window.tokensChart.update();
      }
    }
    
    // 初始化主题
    initTheme();
    
    // 7天趋势数据
    const weeklyData = ${JSON.stringify(weekly)};
    
    // 7天请求趋势图
    const requestsCtx = document.getElementById('requestsChart').getContext('2d');
    const requestsGradient = requestsCtx.createLinearGradient(0, 0, 0, 400);
    requestsGradient.addColorStop(0, 'rgba(0, 122, 255, 0.3)');
    requestsGradient.addColorStop(1, 'rgba(0, 122, 255, 0)');

    window.requestsChart = new Chart(requestsCtx, {
      type: 'line',
      data: {
        labels: weeklyData.map(d => d.date.slice(5)),
        datasets: [{
          label: 'Requests',
          data: weeklyData.map(d => d.totalRequests),
          borderColor: 'rgb(0, 122, 255)',
          backgroundColor: requestsGradient,
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointBackgroundColor: 'rgb(0, 122, 255)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
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
              color: 'rgb(28, 28, 30)',
              font: { family: 'Inter', size: 12, weight: '500' }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
            ticks: { color: 'rgb(58, 58, 60)', font: { family: 'Inter' } }
          },
          y: {
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
            ticks: { color: 'rgb(58, 58, 60)', font: { family: 'Inter' } }
          }
        }
      }
    });

    // 7天Token趋势图
    const tokensCtx = document.getElementById('tokensChart').getContext('2d');
    const tokensGradient = tokensCtx.createLinearGradient(0, 0, 0, 400);
    tokensGradient.addColorStop(0, 'rgba(175, 82, 222, 0.3)');
    tokensGradient.addColorStop(1, 'rgba(175, 82, 222, 0)');

    window.tokensChart = new Chart(tokensCtx, {
      type: 'line',
      data: {
        labels: weeklyData.map(d => d.date.slice(5)),
        datasets: [{
          label: 'Tokens (k)',
          data: weeklyData.map(d => Math.round(d.totalTokens / 1000)),
          borderColor: 'rgb(175, 82, 222)',
          backgroundColor: tokensGradient,
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointBackgroundColor: 'rgb(175, 82, 222)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
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
              color: 'rgb(28, 28, 30)',
              font: { family: 'Inter', size: 12, weight: '500' }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
            ticks: { color: 'rgb(58, 58, 60)', font: { family: 'Inter' } }
          },
          y: {
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
            ticks: { color: 'rgb(58, 58, 60)', font: { family: 'Inter' } }
          }
        }
      }
    });

    // 根据当前主题更新图表颜色
    updateChartsTheme(localStorage.getItem('savor-theme') || 'light');

    // 加载昨日统计
    async function loadYesterdayStats() {
      try {
        const yesterdayRes = await fetch('/api/stats/yesterday');
        const yesterday = await yesterdayRes.json();
        document.getElementById('totalRequests').textContent = yesterday.totalRequests;
        document.getElementById('totalTokens').textContent = Math.round(yesterday.totalTokens / 1000) + 'k';
        document.getElementById('totalPromptTokens').textContent = Math.round(yesterday.totalCompletionTokens / 1000) + 'k';
        document.getElementById('totalCompletionTokens').textContent = Math.round(yesterday.totalPromptTokens / 1000) + 'k';
        
        const totalPrivacyFilteredEl = document.getElementById('totalPrivacyFiltered');
        const totalContextTruncatedEl = document.getElementById('totalContextTruncated');
        const totalSavedTokensEl = document.getElementById('totalSavedTokens');
        const totalAvgResponseTimeEl = document.getElementById('totalAvgResponseTime');
        
        if (totalPrivacyFilteredEl) totalPrivacyFilteredEl.textContent = yesterday.privacyFiltered || 0;
        if (totalContextTruncatedEl) totalContextTruncatedEl.textContent = yesterday.contextTruncated || 0;
        if (totalSavedTokensEl) totalSavedTokensEl.textContent = Math.round((yesterday.savedTokens || 0) / 1000) + 'k';
        if (totalAvgResponseTimeEl) totalAvgResponseTimeEl.textContent = (yesterday.avgDuration || 0) + 'ms';
      } catch (e) {
        console.error('Failed to load yesterday stats:', e);
      }
    }
    
    // 加载今日统计
    async function loadTodayStats() {
      try {
        const todayRes = await fetch('/api/stats/today');
        const today = await todayRes.json();
        updateTodayStats(today);
        updateWeeklyCharts(today.weekly || weeklyData);
      } catch (e) {
        console.error('Failed to load today stats:', e);
      }
    }
    
    // 更新 7 天趋势图表
    function updateWeeklyCharts(data) {
      if (window.requestsChart && window.tokensChart) {
        window.requestsChart.data.labels = data.map(d => d.date.slice(5));
        window.requestsChart.data.datasets[0].data = data.map(d => d.totalRequests);
        window.requestsChart.update();
        
        window.tokensChart.data.labels = data.map(d => d.date.slice(5));
        window.tokensChart.data.datasets[0].data = data.map(d => Math.round(d.totalTokens / 1000));
        window.tokensChart.update();
      }
    }
    
    // 更新今日统计卡片
    function updateTodayStats(today) {
      const todayRequestsEl = document.getElementById('todayRequests');
      const todayTokensEl = document.getElementById('todayTokens');
      const todaySavedTokensEl = document.getElementById('todaySavedTokens');
      
      if (todayRequestsEl) todayRequestsEl.textContent = today.totalRequests;
      if (todayTokensEl) todayTokensEl.textContent = Math.round(today.totalTokens / 1000) + 'k';
      
      const todayPromptTokensEl = document.getElementById('todayPromptTokens');
      const todayCompletionTokensEl = document.getElementById('todayCompletionTokens');
      if (todayPromptTokensEl) todayPromptTokensEl.textContent = Math.round(today.totalCompletionTokens / 1000) + 'k';
      if (todayCompletionTokensEl) todayCompletionTokensEl.textContent = Math.round(today.totalPromptTokens / 1000) + 'k';
      
      const todayContextTruncatedEl = document.getElementById('todayContextTruncated');
      if (todayContextTruncatedEl) todayContextTruncatedEl.textContent = today.contextTruncated || 0;
      
      const todaySavedTokensCalc = today.savedTokens || 0;
      if (todaySavedTokensEl) todaySavedTokensEl.textContent = Math.round(todaySavedTokensCalc / 1000) + 'k';
      
      const todayAvgResponseTimeEl = document.getElementById('avgResponseTime');
      if (todayAvgResponseTimeEl) todayAvgResponseTimeEl.textContent = (today.avgDuration || 0) + 'ms';
      
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
          var filterMarkersHtml = '';
          if (r.filterMarkers && r.filterMarkers.length > 0) {
            filterMarkersHtml = r.filterMarkers.map(function(marker) {
              var text = escapeHtml(marker.trim());
              return '<span style="background: rgba(52, 199, 89, 0.1); color: rgb(52, 199, 89); padding: 2px 8px; border-radius: 3px; font-size: 0.7rem; margin-left: 8px; text-transform: uppercase; font-weight: 600;">' + text + '</span>';
            }).join('');
          }
          return \`
          <div class="log-entry">
            <span class="log-time">\${new Date(r.timestamp).toLocaleTimeString('zh-CN', {hour12: false})}</span>
            <span class="log-status \${escapeHtml(r.status)}">[\${escapeHtml(r.status).toUpperCase()}]</span>
            <span class="log-model">\${escapeHtml(r.model)}</span>
            \${filterMarkersHtml}
            <span class="log-tokens">Tokens: \${r.totalTokens} = \${r.promptTokens} + \${r.completionTokens}</span>
            <span class="log-duration">⏱️ \${r.duration}ms</span>
          </div>
        \`;
        }).join('');
      } catch (e) {
        console.error('Failed to load logs:', e);
      }
    }
    
    // 初始加载
    loadYesterdayStats();
    loadTodayStats();
    loadLogs();

    // HTML 转义（防 XSS）
    function escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    
    // 定时刷新
    setInterval(loadTodayStats, 5000);
    setInterval(loadLogs, 5000);
  </script>
</body>
</html>`;
}