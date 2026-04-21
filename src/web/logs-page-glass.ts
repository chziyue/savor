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
 * Savor - 日志页面 (Glass 主题)
 * 毛玻璃风格日志页面
 */

import { getRecentLogsSummary } from '../utils/stats.js';

export function renderLogsPageGlass(): string {
  // 服务器端预先获取日志数据
  const allLogs = getRecentLogsSummary(100);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayLogs = allLogs.filter(r => r.timestamp >= todayStart);
  
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SAVOR // SYSTEM_LOGS</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
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
      
      /* 日志页特有 */
      --log-entry-bg: rgba(0, 0, 0, 0.03);
      --log-detail-bg: rgba(0, 0, 0, 0.02);
      --code-bg: rgba(0, 0, 0, 0.04);
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
      
      --log-entry-bg: rgba(0, 0, 0, 0.3);
      --log-detail-bg: rgba(0, 0, 0, 0.5);
      --code-bg: rgba(0, 0, 0, 0.6);
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
    
    .back-btn {
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
      cursor: pointer;
    }
    
    .back-btn:hover {
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
    
    /* 日志容器 */
    .logs-panel {
      background: var(--bg-card);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-card);
      padding: 28px;
      backdrop-filter: blur(var(--glass-blur)) saturate(180%);
      box-shadow: var(--shadow-lg), var(--shadow-inset);
      min-height: 200px;
    }
    
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid var(--border-subtle);
    }
    
    .panel-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text-primary);
    }
    
    .log-count {
      font-size: 0.9rem;
      color: var(--text-secondary);
    }
    
    /* 日志列表 */
    #logContainer {
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
      max-height: 800px;
      min-height: 100px;
      overflow-y: auto;
    }
    
    /* 日志条目 */
    .log-entry {
      padding: 12px 15px;
      margin-bottom: 8px;
      background: var(--log-entry-bg);
      border-left: 3px solid var(--accent-primary);
      border-radius: var(--radius-card-sm);
      transition: all 0.2s;
    }
    
    .log-entry.error {
      border-left-color: var(--color-error);
    }
    
    .log-summary {
      display: flex;
      align-items: center;
      gap: 15px;
      flex-wrap: wrap;
      cursor: pointer;
      padding: 12px 15px;
      margin: -12px -15px;
      line-height: 1.5;
    }
    
    .log-summary:hover {
      background: var(--color-success-bg);
    }
    
    .log-time {
      color: var(--accent-tertiary);
      font-size: 0.85rem;
      min-width: 140px;
      font-weight: 500;
    }
    
    .log-status {
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    
    .log-status.success {
      background: var(--color-success-bg);
      color: var(--color-success);
    }
    
    .log-status.error {
      background: var(--color-error-bg);
      color: var(--color-error);
    }
    
    .filter-markers-container {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    
    .log-filter-marker {
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 0.7rem;
      font-weight: 600;
      background: var(--color-success-bg);
      color: var(--color-success);
      text-transform: uppercase;
    }
    
    .log-model {
      color: var(--accent-primary);
      font-weight: 600;
    }
    
    .log-tokens {
      color: var(--text-secondary);
      font-size: 0.85rem;
    }
    
    .log-duration {
      color: var(--accent-secondary);
      font-size: 0.85rem;
      font-weight: 500;
    }
    
    .expand-icon {
      margin-left: auto;
      color: var(--accent-primary);
      transition: transform 0.3s;
    }
    
    .log-entry.expanded .expand-icon {
      transform: rotate(180deg);
    }
    
    /* 日志详情 */
    .log-details {
      display: none;
      margin-top: 15px;
      padding: 15px;
      background: var(--log-detail-bg);
      border-radius: var(--radius-card-sm);
      border: 1px solid var(--border-subtle);
    }
    
    .log-entry.expanded .log-details {
      display: block;
    }
    
    .detail-row {
      display: flex;
      margin-bottom: 8px;
      font-size: 0.85rem;
    }
    
    .detail-label {
      color: var(--accent-primary);
      min-width: 120px;
      font-weight: 600;
    }
    
    .detail-value {
      color: var(--text-primary);
      word-break: break-all;
    }
    
    .detail-value.error-message {
      color: var(--color-error);
    }
    
    /* 代码块 */
    .code-block-container {
      position: relative;
      margin-top: 10px;
    }
    
    .code-block {
      background: var(--code-bg);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-card-sm);
      padding: 15px;
      max-height: 400px;
      overflow-y: auto;
    }
    
    .code-block pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-all;
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 0.8rem;
      line-height: 1.5;
      color: var(--text-primary);
    }
    
    .request-body {
      min-height: 600px;
      max-height: 800px;
    }
    
    .response-body {
      min-height: 100px;
      max-height: 400px;
    }
    
    .copy-btn {
      position: absolute;
      top: 8px;
      right: 18px;
      padding: 5px 10px;
      background: rgba(116, 116, 128, 0.1);
      border: none;
      border-radius: 6px;
      color: var(--text-secondary);
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      z-index: 100;
    }
    
    .copy-btn:hover {
      background: rgba(116, 116, 128, 0.2);
      color: var(--text-primary);
    }
    
    .copy-btn.copied {
      background: var(--color-success-bg);
      color: var(--color-success);
    }
    
    .loading {
      text-align: center;
      padding: 40px;
      color: var(--accent-primary);
    }
    
    .loading::after {
      content: '';
      display: inline-block;
      width: 20px;
      height: 20px;
      margin-left: 10px;
      border: 2px solid var(--accent-primary);
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .empty-state {
      text-align: center;
      padding: 60px;
      color: var(--text-secondary);
    }
    
    .empty-state-icon {
      font-size: 3rem;
      margin-bottom: 15px;
      opacity: 0.5;
    }

    .pagination {
      display: flex;
      justify-content: center;
      gap: 8px;
      padding: 20px 0 0;
    }

    .pagination-btn {
      min-width: 40px;
      height: 40px;
      background: var(--btn-bg);
      border: 1px solid var(--btn-border);
      border-radius: 12px;
      color: var(--btn-text);
      font-size: 0.9rem;
      cursor: pointer;
    }

    .pagination-btn:hover:not(.active) {
      background: var(--btn-hover-bg);
      color: var(--btn-hover-text);
    }

    .pagination-btn.active {
      background: var(--accent-primary-bg);
      border-color: var(--accent-primary);
      color: var(--accent-primary);
    }
  </style>
</head>
<body>
  <div class="orb orb-blue"></div>
  <div class="orb orb-purple"></div>
  <div class="orb orb-green"></div>
  
  <div class="container">
    <header>
      <div class="logo">SAVOR // SYSTEM_LOGS</div>
      <div class="header-actions">
        <a href="/" class="back-btn">← 返回看板</a>
        <button class="theme-toggle" onclick="toggleTheme()" title="切换主题">
          <span id="theme-icon">🌙</span>
        </button>
      </div>
    </header>
    
    <div class="logs-panel">
      <div class="panel-header">
        <div class="panel-title">今日日志</div>
        <div style="display: flex; align-items: center; gap: 15px;">
          <div class="log-count" id="logCount">共 ${todayLogs.length} 条记录</div>
          <button class="back-btn" onclick="refreshLogs()">刷新</button>
        </div>
      </div>
      
      <div id="logContainer">
        ${todayLogs.length === 0 ? `<div class="empty-state"><div class="empty-state-icon">📭</div><div>今日暂无日志记录</div></div>` : todayLogs.map((r, index) => {
          const date = new Date(r.timestamp);
          const timeStr = date.toLocaleString('zh-CN', {
            month: '2-digit', day: '2-digit', hour: '2-digit',
            minute: '2-digit', second: '2-digit', hour12: false
          });
          const isError = r.status !== 'success';
          let filterMarkersHtml = '';
          if (r.filterMarkers) {
            const markers = typeof r.filterMarkers === 'string' ? JSON.parse(r.filterMarkers) : r.filterMarkers;
            if (markers && markers.length > 0) {
              filterMarkersHtml = '<div class="filter-markers-container">' +
                markers.map((marker: string) => {
                  const text = marker.trim();
                  return '<span class="log-filter-marker">' + text.toUpperCase() + '</span>';
                }).join('') + '</div>';
            }
          }
          return `<div class="log-entry ${isError ? 'error' : ''}" data-index="${index}" data-id="${r.id}">
            <div class="log-summary" onclick="toggleLog(event, ${index})">
            <span class="log-time">${timeStr}</span>
            <span class="log-status ${r.status}">${r.status.toUpperCase()}</span>
            <span class="log-model">${r.model}</span>
            ${filterMarkersHtml}
            <span class="log-tokens">Tokens: ${r.promptTokens} + ${r.completionTokens} = ${r.totalTokens}</span>
            <span class="log-duration">⏱️ ${r.duration}ms</span>
            <span class="expand-icon">▼</span>
            </div>
            <div class="log-details" id="log-details-${index}">
            <div class="detail-row"><span class="detail-label">时间戳:</span><span class="detail-value">${date.toISOString()}</span></div>
            <div class="detail-row"><span class="detail-label">模型:</span><span class="detail-value">${r.model}</span></div>
            <div class="detail-row"><span class="detail-label">状态:</span><span class="detail-value">${r.status}</span></div>
            <div class="detail-row"><span class="detail-label">Prompt Tokens:</span><span class="detail-value">${r.promptTokens}</span></div>
            <div class="detail-row"><span class="detail-label">Completion Tokens:</span><span class="detail-value">${r.completionTokens}</span></div>
            <div class="detail-row"><span class="detail-label">Total Tokens:</span><span class="detail-value">${r.totalTokens}</span></div>
            <div class="detail-row"><span class="detail-label">耗时:</span><span class="detail-value">${r.duration}ms</span></div>
            ${r.errorMessage ? `<div class="detail-row"><span class="detail-label">错误信息:</span><span class="detail-value error-message">${r.errorMessage}</span></div>` : ''}
            <div class="detail-row" style="margin-top: 15px;"><span class="detail-label">请求体 (Request):</span></div>
            <div class="code-block-container"><button class="copy-btn" onclick="copyCode(event, 'req-${index}')">复制</button>
            <div class="code-block"><pre id="req-${index}" class="request-body"></pre></div></div>
            <div class="detail-row" style="margin-top: 15px;"><span class="detail-label">响应体 (Response):</span></div>
            <div class="code-block-container"><button class="copy-btn" onclick="copyCode(event, 'resp-${index}')">复制</button>
            <div class="code-block"><pre id="resp-${index}" class="response-body"></pre></div></div>
            </div></div>`;
        }).join('')}
      </div>
      ${todayLogs.length >= 100 ? '<div class="pagination" id="pagination"><button class="pagination-btn active" onclick="goToPage(1)">1</button><button class="pagination-btn" onclick="goToPage(2)">2</button><button class="pagination-btn" onclick="goToPage(3)">3</button><button class="pagination-btn" onclick="goToPage(4)">4</button><button class="pagination-btn" onclick="goToPage(5)">5</button></div>' : ''}
    </div>
  </div>
  
  <script>
    // 主题切换功能
    function initTheme() {
      var savedTheme = localStorage.getItem('savor-theme') || 'light';
      document.documentElement.setAttribute('data-theme', savedTheme);
      updateThemeIcon(savedTheme);
    }
    
    function toggleTheme() {
      var currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      var newTheme = currentTheme === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('savor-theme', newTheme);
      updateThemeIcon(newTheme);
    }
    
    function updateThemeIcon(theme) {
      var icon = document.getElementById('theme-icon');
      if (icon) {
        icon.textContent = theme === 'light' ? '🌙' : '☀️';
      }
    }
    
    // 初始化主题
    initTheme();
    
    // 初始日志 ID 列表（服务器端渲染）
    var logIds = ${JSON.stringify(todayLogs.map(r => r.id))};
    
    async function refreshLogs() {
      document.getElementById('logContainer').innerHTML = '<div class="loading">刷新中...</div>';
      try {
        var now = new Date();
        var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        var res = await fetch('/api/logs/summary?limit=100');
        var allRequests = await res.json();
        var todayRequests = allRequests.filter(function(r) { return r.timestamp >= todayStart; });
        
        var container = document.getElementById('logContainer');
        var countEl = document.getElementById('logCount');
        
        countEl.textContent = '共 ' + todayRequests.length + ' 条记录';
        
        if (todayRequests.length === 0) {
          container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div>今日暂无日志记录</div></div>';
          return;
        }
        
        logIds = todayRequests.map(function(r) { return r.id; });
        
        container.innerHTML = todayRequests.map(function(r, index) {
          var date = new Date(r.timestamp);
          var timeStr = date.toLocaleString('zh-CN', {
            month: '2-digit', day: '2-digit', hour: '2-digit',
            minute: '2-digit', second: '2-digit', hour12: false
          });
          
          var isError = r.status !== 'success';
          var filterMarkersHtml = '';
          if (r.filterMarkers && r.filterMarkers.length > 0) {
            filterMarkersHtml = '<div class="filter-markers-container">' +
              r.filterMarkers.map(function(marker) {
                var text = marker.trim();
                return '<span class="log-filter-marker">' + text.toUpperCase() + '</span>';
              }).join('') + '</div>';
          }
          
          return '<div class="log-entry ' + (isError ? 'error' : '') + '" data-index="' + index + '" data-id="' + r.id + '">' +
            '<div class="log-summary" onclick="toggleLog(event, ' + index + ')">' +
            '<span class="log-time">' + timeStr + '</span>' +
            '<span class="log-status ' + r.status + '">' + r.status.toUpperCase() + '</span>' +
            '<span class="log-model">' + r.model + '</span>' +
            filterMarkersHtml +
            '<span class="log-tokens">Tokens: ' + r.promptTokens + ' + ' + r.completionTokens + ' = ' + r.totalTokens + '</span>' +
            '<span class="log-duration">⏱️ ' + r.duration + 'ms</span>' +
            '<span class="expand-icon">▼</span>' +
            '</div>' +
            '<div class="log-details" id="log-details-' + index + '">' +
            '<div class="detail-row"><span class="detail-label">时间戳:</span><span class="detail-value">' + date.toISOString() + '</span></div>' +
            '<div class="detail-row"><span class="detail-label">模型:</span><span class="detail-value">' + r.model + '</span></div>' +
            '<div class="detail-row"><span class="detail-label">状态:</span><span class="detail-value">' + r.status + '</span></div>' +
            '<div class="detail-row"><span class="detail-label">Prompt Tokens:</span><span class="detail-value">' + r.promptTokens + '</span></div>' +
            '<div class="detail-row"><span class="detail-label">Completion Tokens:</span><span class="detail-value">' + r.completionTokens + '</span></div>' +
            '<div class="detail-row"><span class="detail-label">Total Tokens:</span><span class="detail-value">' + r.totalTokens + '</span></div>' +
            '<div class="detail-row"><span class="detail-label">耗时:</span><span class="detail-value">' + r.duration + 'ms</span></div>' +
            (r.errorMessage ? '<div class="detail-row"><span class="detail-label">错误信息:</span><span class="detail-value error-message">' + r.errorMessage + '</span></div>' : '') +
            '<div class="detail-row" style="margin-top: 15px;"><span class="detail-label">请求体 (Request):</span></div>' +
            '<div class="code-block-container"><button class="copy-btn" onclick="copyCode(event, &#39;req-' + index + '&#39;)">复制</button>' +
            '<div class="code-block"><pre id="req-' + index + '" class="request-body"></pre></div></div>' +
            '<div class="detail-row" style="margin-top: 15px;"><span class="detail-label">响应体 (Response):</span></div>' +
            '<div class="code-block-container"><button class="copy-btn" onclick="copyCode(event, &#39;resp-' + index + '&#39;)">复制</button>' +
            '<div class="code-block"><pre id="resp-' + index + '" class="response-body"></pre></div></div>' +
            '</div></div>';
        }).join('');
      } catch (e) {
        document.getElementById('logContainer').innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><div>加载日志失败: ' + e.message + '</div></div>';
      }
    }
    
    async function toggleLog(event, index) {
      event.stopPropagation();
      var entry = document.querySelector('[data-index="' + index + '"]');
      var details = document.getElementById('log-details-' + index);
      
      if (!entry || !details) return;
      
      entry.classList.toggle('expanded');
      var isExpanded = entry.classList.contains('expanded');
      
      if (isExpanded && details.dataset.loaded !== 'true') {
        var logId = entry.getAttribute('data-id');
        if (logId) {
          try {
            var res = await fetch('/api/logs/' + logId);
            var log = await res.json();
            
            var reqPre = document.getElementById('req-' + index);
            if (reqPre) reqPre.textContent = log.requestBody || '无数据';
            
            var respPre = document.getElementById('resp-' + index);
            if (respPre) respPre.textContent = log.responseBody || '无数据';
            
            details.dataset.loaded = 'true';
          } catch (e) {
            var reqPre = document.getElementById('req-' + index);
            if (reqPre) reqPre.textContent = '加载失败';
          }
        }
      }
    }

    async function copyCode(event, elementId) {
      event.stopPropagation();
      var preElement = document.getElementById(elementId);
      var btn = event.currentTarget;
      if (!preElement) return;
      var text = preElement.textContent;
      var originalText = btn.innerHTML;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          var textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.left = '-9999px';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }
        btn.innerHTML = '已复制';
        btn.classList.add('copied');
        setTimeout(function() {
          btn.innerHTML = originalText;
          btn.classList.remove('copied');
        }, 2000);
      } catch (err) {
        btn.innerHTML = '❌ 失败';
        setTimeout(function() { btn.innerHTML = originalText; }, 2000);
      }
    }

    // 分页锚点（第一页最后一条的 timestamp）
    var pageAnchors = {};
    ${todayLogs.length >= 100 ? `pageAnchors[1] = ${todayLogs[todayLogs.length - 1].timestamp};` : ''}

    async function goToPage(page) {
      // 更新分页按钮状态
      var btns = document.querySelectorAll('.pagination-btn');
      btns.forEach(function(btn, i) { btn.classList.toggle('active', i + 1 === page); });

      var container = document.getElementById('logContainer');
      container.innerHTML = '<div class="loading">加载中...</div>';

      // 计算锚点：第N页需要第N-1页的最后一条 timestamp
      var anchor = page > 1 ? pageAnchors[page - 1] : null;

      var url = '/api/logs/summary?limit=100&today=true';
      if (anchor) url += '&before=' + anchor;

      try {
        var res = await fetch(url);
        var logs = await res.json();

        // 保存当前页锚点
        if (logs.length > 0) pageAnchors[page] = logs[logs.length - 1].timestamp;

        renderLogs(logs, page);
        document.getElementById('logCount').textContent = '第 ' + page + ' 页，' + logs.length + ' 条记录';
      } catch (e) {
        container.innerHTML = '<div class="empty-state">加载失败</div>';
      }
    }

    function renderLogs(logs, page) {
      var container = document.getElementById('logContainer');
      if (logs.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div>该页无日志</div></div>';
        return;
      }

      container.innerHTML = logs.map(function(r, idx) {
        var globalIndex = (page - 1) * 100 + idx;
        var date = new Date(r.timestamp);
        var timeStr = date.toLocaleString('zh-CN', {month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false});
        var isError = r.status !== 'success';
        var filterMarkersHtml = '';
        if (r.filterMarkers && r.filterMarkers.length > 0) {
          filterMarkersHtml = '<div class="filter-markers-container">' + r.filterMarkers.map(function(m) { return '<span class="log-filter-marker">' + m.trim().toUpperCase() + '</span>'; }).join('') + '</div>';
        }
        return '<div class="log-entry ' + (isError ? 'error' : '') + '" data-index="' + globalIndex + '" data-id="' + r.id + '">' +
          '<div class="log-summary" onclick="toggleLog(event, ' + globalIndex + ')">' +
          '<span class="log-time">' + timeStr + '</span>' +
          '<span class="log-status ' + r.status + '">' + r.status.toUpperCase() + '</span>' +
          '<span class="log-model">' + r.model + '</span>' +
          filterMarkersHtml +
          '<span class="log-tokens">Tokens: ' + r.promptTokens + ' + ' + r.completionTokens + ' = ' + r.totalTokens + '</span>' +
          '<span class="log-duration">⏱️ ' + r.duration + 'ms</span>' +
          '<span class="expand-icon">▼</span></div>' +
          '<div class="log-details" id="log-details-' + globalIndex + '">' +
          '<div class="detail-row"><span class="detail-label">时间戳:</span><span class="detail-value">' + date.toISOString() + '</span></div>' +
          '<div class="detail-row"><span class="detail-label">模型:</span><span class="detail-value">' + r.model + '</span></div>' +
          '<div class="detail-row"><span class="detail-label">状态:</span><span class="detail-value">' + r.status + '</span></div>' +
          '<div class="detail-row"><span class="detail-label">Prompt Tokens:</span><span class="detail-value">' + r.promptTokens + '</span></div>' +
          '<div class="detail-row"><span class="detail-label">Completion Tokens:</span><span class="detail-value">' + r.completionTokens + '</span></div>' +
          '<div class="detail-row"><span class="detail-label">Total Tokens:</span><span class="detail-value">' + r.totalTokens + '</span></div>' +
          '<div class="detail-row"><span class="detail-label">耗时:</span><span class="detail-value">' + r.duration + 'ms</span></div>' +
          (r.errorMessage ? '<div class="detail-row"><span class="detail-label">错误信息:</span><span class="detail-value error-message">' + r.errorMessage + '</span></div>' : '') +
          '<div class="detail-row" style="margin-top: 15px;"><span class="detail-label">请求体 (Request):</span></div>' +
          '<div class="code-block-container"><button class="copy-btn" onclick="copyCode(event, &#39;req-' + globalIndex + '&#39;)">复制</button>' +
          '<div class="code-block"><pre id="req-' + globalIndex + '" class="request-body"></pre></div></div>' +
          '<div class="detail-row" style="margin-top: 15px;"><span class="detail-label">响应体 (Response):</span></div>' +
          '<div class="code-block-container"><button class="copy-btn" onclick="copyCode(event, &#39;resp-' + globalIndex + '&#39;)">复制</button>' +
          '<div class="code-block"><pre id="resp-' + globalIndex + '" class="response-body"></pre></div></div>' +
          '</div></div>';
      }).join('');
    }
  </script>
</body>
</html>`;
}