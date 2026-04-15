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
 * Savor - 日志页面
 * 独立文件，与首页分离
 */

export function renderLogsPage(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SAVOR // SYSTEM_LOGS</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;500;700&family=Share+Tech+Mono&display=swap" rel="stylesheet">
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
    
    /* 扫描线效果 */
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
      font-family: 'Orbitron', sans-serif;
      font-size: 2rem;
      font-weight: 900;
      background: linear-gradient(90deg, var(--neon-cyan), var(--neon-pink));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-shadow: 0 0 30px rgba(0, 245, 255, 0.5);
    }
    
    .subtitle {
      font-size: 0.9rem;
      color: rgba(255, 255, 255, 0.6);
      margin-top: 5px;
      letter-spacing: 2px;
    }
    
    /* 返回按钮 */
    .back-btn {
      padding: 12px 24px;
      background: rgba(0, 245, 255, 0.1);
      border: none;
      color: var(--neon-cyan);
      font-family: 'Orbitron', sans-serif;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.3s;
      text-decoration: none;
      display: inline-block;
    }
    
    .back-btn:hover {
      background: var(--neon-cyan);
      color: #000;
      box-shadow: 0 0 20px var(--neon-cyan);
    }
    
    /* 日志容器 */
    .logs-panel {
      background: var(--panel-bg);
      border: 1px solid var(--grid-color);
      border-radius: 10px;
      padding: 25px;
      backdrop-filter: blur(10px);
    }
    
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid var(--grid-color);
    }
    
    .panel-title {
      font-family: 'Orbitron', sans-serif;
      font-size: 1.2rem;
      color: var(--neon-cyan);
      text-shadow: 0 0 10px var(--neon-cyan);
    }
    
    .log-count {
      font-size: 0.9rem;
      color: rgba(255, 255, 255, 0.6);
    }
    
    /* 日志列表 */
    #logContainer {
      font-family: 'Share Tech Mono', monospace;
      max-height: 800px;
      overflow-y: auto;
    }
    
    #logContainer::-webkit-scrollbar {
      width: 10px;
    }
    
    #logContainer::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.3);
    }
    
    #logContainer::-webkit-scrollbar-thumb {
      background: var(--neon-cyan);
      border-radius: 4px;
    }
    
    /* 日志条目 */
    .log-entry {
      padding: 12px 15px;
      margin-bottom: 8px;
      background: rgba(0, 0, 0, 0.3);
      border-left: 3px solid var(--neon-cyan);
      transition: all 0.3s;
      position: relative;
      overflow: hidden;
    }
    
    .log-entry.error {
      border-left-color: #ff4444;
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
    
    .log-summary span {
      line-height: 1;
    }
    
    .log-summary:hover {
      background: rgba(0, 245, 255, 0.1);
    }
    
    .log-time {
      color: var(--neon-purple);
      font-size: 0.85rem;
      min-width: 140px;
    }
    
    .log-status {
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 0.75rem;
      font-weight: bold;
    }
    
    .log-status.success {
      background: rgba(0, 255, 136, 0.2);
      color: #00ff88;
    }
    
    .log-status.error {
      background: rgba(255, 68, 68, 0.2);
      color: #ff4444;
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
      font-weight: bold;
      font-family: 'Share Tech Mono', monospace;
      background: rgba(0, 255, 136, 0.2);
      color: #00ff88;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .log-model {
      color: var(--neon-cyan);
      font-weight: bold;
    }
    
    .log-tokens {
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.85rem;
    }
    
    .log-duration {
      color: var(--neon-pink);
      font-size: 0.85rem;
    }
    
    .expand-icon {
      margin-left: auto;
      color: var(--neon-cyan);
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
      background: rgba(0, 0, 0, 0.5);
      border-radius: 5px;
      border: 1px solid var(--grid-color);
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
      color: var(--neon-cyan);
      min-width: 120px;
      font-weight: bold;
    }
    
    .detail-value {
      color: rgba(255, 255, 255, 0.8);
      word-break: break-all;
    }
    
    .detail-value.error-message {
      color: #ff4444;
    }
    
    /* 代码块 */
    .code-block-container {
      position: relative;
      margin-top: 10px;
    }
    
    .code-block {
      background: rgba(0, 0, 0, 0.6);
      border: 1px solid var(--grid-color);
      border-radius: 5px;
      padding: 15px;
      max-height: 400px;
      overflow-y: auto;
    }

    .code-block pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-all;
      font-family: 'Share Tech Mono', monospace;
      font-size: 0.8rem;
      line-height: 1.5;
      color: rgba(255, 255, 255, 0.9);
    }
    
    .request-body {
      min-height: 600px;
      max-height: 800px;
    }
    
    .response-body {
      min-height: 100px;
      max-height: 400px;
    }

    .code-block::-webkit-scrollbar {
      width: 10px;
    }

    .code-block::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.3);
    }

    .code-block::-webkit-scrollbar-thumb {
      background: var(--neon-cyan);
      border-radius: 3px;
    }

    .copy-btn {
      position: absolute;
      top: 8px;
      right: 18px;
      padding: 6px 12px;
      background: rgba(0, 245, 255, 0.15);
      border: 1px solid var(--neon-cyan);
      border-radius: 4px;
      color: var(--neon-cyan);
      font-family: 'Share Tech Mono', monospace;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.3s;
      z-index: 100;
    }

    .copy-btn:hover {
      background: var(--neon-cyan);
      color: #000;
      box-shadow: 0 0 10px var(--neon-cyan);
    }

    .copy-btn.copied {
      background: rgba(0, 255, 136, 0.3);
      border-color: #00ff88;
      color: #00ff88;
    }
    
    .loading {
      text-align: center;
      padding: 40px;
      color: var(--neon-cyan);
    }
    
    .loading::after {
      content: '';
      display: inline-block;
      width: 20px;
      height: 20px;
      margin-left: 10px;
      border: 2px solid var(--neon-cyan);
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
      color: rgba(255, 255, 255, 0.5);
    }
    
    .empty-state-icon {
      font-size: 3rem;
      margin-bottom: 15px;
      opacity: 0.5;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <div class="logo">SAVOR // SYSTEM_LOGS</div>
        <div class="subtitle">实时请求日志监控</div>
      </div>
      <a href="/" class="back-btn">← 返回看板</a>
    </header>
    
    <div class="logs-panel">
      <div class="panel-header">
        <div class="panel-title">今日日志</div>
        <div style="display: flex; align-items: center; gap: 15px;">
          <div class="log-count" id="logCount">加载中...</div>
          <button class="back-btn" onclick="refreshLogs()" style="padding: 8px 16px; font-size: 0.8rem;">刷新</button>
        </div>
      </div>
      
      <div id="logContainer">
        <div class="loading">正在加载日志数据</div>
      </div>
    </div>
  </div>
  
  <script>
    // 存储日志 ID 映射
    var logIds = [];
    
    async function loadLogs() {
      try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const res = await fetch('/api/logs/summary?limit=100');
        const allRequests = await res.json();
        const todayRequests = allRequests.filter(r => r.timestamp >= todayStart);
        
        const container = document.getElementById('logContainer');
        const countEl = document.getElementById('logCount');
        
        countEl.textContent = '共 ' + todayRequests.length + ' 条记录';
        
        if (todayRequests.length === 0) {
          container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div>今日暂无日志记录</div></div>';
          return;
        }
        
        logIds = todayRequests.map(r => r.id);
        
        container.innerHTML = todayRequests.map(function(r, index) {
          const date = new Date(r.timestamp);
          const timeStr = date.toLocaleString('zh-CN', {
            month: '2-digit', day: '2-digit', hour: '2-digit',
            minute: '2-digit', second: '2-digit', hour12: false
          });
          
          const isError = r.status !== 'success';
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
            '<div class="code-block-container"><button class="copy-btn" onclick="copyCode(event, ' + "'" + 'req-' + index + "'" + ')">复制</button>' +
            '<div class="code-block"><pre id="req-' + index + '" class="request-body"></pre></div></div>' +
            '<div class="detail-row" style="margin-top: 15px;"><span class="detail-label">响应体 (Response):</span></div>' +
            '<div class="code-block-container"><button class="copy-btn" onclick="copyCode(event, ' + "'" + 'resp-' + index + "'" + ')">复制</button>' +
            '<div class="code-block"><pre id="resp-' + index + '" class="response-body"></pre></div></div>' +
            '</div></div>';
        }).join('');
      } catch (e) {
        document.getElementById('logContainer').innerHTML = '<div class="empty-state"><div class="empty-state-icon">❌</div><div>加载日志失败: ' + e.message + '</div></div>';
      }
    }
    
    function escapeHtml(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    async function toggleLog(event, index) {
      event.stopPropagation();
      const entry = document.querySelector('[data-index="' + index + '"]');
      const details = document.getElementById('log-details-' + index);
      
      if (!entry || !details) return;
      
      entry.classList.toggle('expanded');
      const isExpanded = entry.classList.contains('expanded');
      
      // 展开时加载详情
      if (isExpanded && details.dataset.loaded !== 'true') {
        const logId = entry.getAttribute('data-id');
        if (logId) {
          try {
            const res = await fetch('/api/logs/' + logId);
            const log = await res.json();
            
            const reqPre = document.getElementById('req-' + index);
            if (reqPre) reqPre.textContent = log.requestBody || '无数据';
            
            const respPre = document.getElementById('resp-' + index);
            if (respPre) respPre.textContent = log.responseBody || '无数据';
            
            details.dataset.loaded = 'true';
          } catch (e) {
            const reqPre = document.getElementById('req-' + index);
            if (reqPre) reqPre.textContent = '加载失败';
          }
        }
      }
    }

    async function copyCode(event, elementId) {
      event.stopPropagation();
      const preElement = document.getElementById(elementId);
      const btn = event.currentTarget;
      if (!preElement) return;
      const text = preElement.textContent;
      const originalText = btn.innerHTML;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          const textarea = document.createElement('textarea');
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
    
    loadLogs();
    
    function refreshLogs() {
      document.getElementById('logContainer').innerHTML = '<div class="loading">刷新中...</div>';
      loadLogs();
    }
  </script>
</body>
</html>`;
}