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
 * Savor - SQLite Database Module
 * 主库存储近7天请求明细 + 实时统计
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger.js';

export interface RequestRecord {
  id: string;
  timestamp: number;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  duration: number;
  status: 'success' | 'error' | 'rate_limited';
  errorMessage?: string;
  requestBody?: string;
  responseBody?: string;
  filterMarkers?: string[];  // 过滤标记（如 ['Privacy', 'Context']）
  contextTruncated?: boolean;  // 是否触发上下文裁切
  savedTokens?: number;  // 节省的 Token 数（上下文裁切）
}

export interface WeeklyStatsRow {
  date: string;
  totalRequests: number;
  successRequests: number;
  totalTokens: number;
  avgDuration: number;
}

export interface LogSummaryRow {
  id: string;
  timestamp: number;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  duration: number;
  status: 'success' | 'error' | 'rate_limited';
  errorMessage?: string;
  filterMarkers?: string;
}

export class StatsDatabase {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath: string = './data/stats.db') {
    this.dbPath = dbPath;
    
    // 确保目录存在
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 连接数据库
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL'); // 提升并发性能
    
    // 初始化表结构
    this.initTables();
    
    logger.info('[StatsDB] 数据库已连接', { path: dbPath });
  }

  /**
   * 初始化表结构
   */
  private initTables(): void {
    // 请求明细表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS requests (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        model TEXT NOT NULL,
        prompt_tokens INTEGER DEFAULT 0,
        completion_tokens INTEGER DEFAULT 0,
        total_tokens INTEGER DEFAULT 0,
        duration INTEGER DEFAULT 0,
        status TEXT CHECK(status IN ('success', 'error', 'rate_limited')),
        error_message TEXT,
        request_body TEXT,
        response_body TEXT,
        filter_markers TEXT,
        context_truncated INTEGER DEFAULT 0,
        saved_tokens INTEGER DEFAULT 0
      );
    `);

    // 创建索引
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_requests_id ON requests(id);
      CREATE INDEX IF NOT EXISTS idx_requests_timestamp ON requests(timestamp);
      CREATE INDEX IF NOT EXISTS idx_requests_model ON requests(model);
      CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
      CREATE INDEX IF NOT EXISTS idx_requests_date ON requests(date(timestamp / 1000, 'unixepoch'));
    `);

    // 每日统计汇总表（加速查询）
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS daily_stats (
        date TEXT PRIMARY KEY,
        total_requests INTEGER DEFAULT 0,
        success_requests INTEGER DEFAULT 0,
        error_requests INTEGER DEFAULT 0,
        total_prompt_tokens INTEGER DEFAULT 0,
        total_completion_tokens INTEGER DEFAULT 0,
        total_tokens INTEGER DEFAULT 0,
        avg_duration REAL DEFAULT 0,
        estimated_cost REAL DEFAULT 0,
        privacy_filtered_count INTEGER DEFAULT 0,
        context_truncated_count INTEGER DEFAULT 0,
        saved_tokens INTEGER DEFAULT 0
      );
    `);

    logger.debug('[StatsDB] 表结构初始化完成');
    
    // 迁移：添加新字段（如果不存在）
    this.migrateAddColumn('daily_stats', 'privacy_filtered_count', 'INTEGER DEFAULT 0');
    this.migrateAddColumn('daily_stats', 'context_truncated_count', 'INTEGER DEFAULT 0');
    this.migrateAddColumn('daily_stats', 'saved_tokens', 'INTEGER DEFAULT 0');
    this.migrateAddColumn('requests', 'context_truncated', 'INTEGER DEFAULT 0');
    this.migrateAddColumn('requests', 'saved_tokens', 'INTEGER DEFAULT 0');
    
    // 启动定时清理任务（每天凌晨 3 点执行）
    this.startCleanupSchedule();
  }
  
  /**
   * 启动定时清理任务（每天凌晨 3 点清理 8 天前的数据）
   */
  private startCleanupSchedule(): void {
    // 计算到下一个凌晨 3 点的毫秒数
    const now = new Date();
    const next3AM = new Date(now);
    next3AM.setHours(3, 0, 0, 0);
    if (next3AM.getTime() <= now.getTime()) {
      next3AM.setDate(next3AM.getDate() + 1);
    }
    const delay = next3AM.getTime() - now.getTime();
    
    logger.info(`[StatsDB] 定时清理任务将在 ${next3AM.toLocaleString('zh-CN')} 执行`);
    
    // 设置定时器
    setTimeout(() => {
      this.cleanupOldRecords();
      // 之后每 24 小时执行一次
      setInterval(() => this.cleanupOldRecords(), 24 * 60 * 60 * 1000);
    }, delay);
  }
  
  /**
   * 清理 7 天前的数据（保留近 8 天以确保 7 天趋势完整）
   */
  private cleanupOldRecords(): void {
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000; // 保留 8 天
    
    // 先统计要删除的记录数
    const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM requests WHERE timestamp < ?');
    const countResult = countStmt.get(eightDaysAgo) as { count: number };
    
    if (countResult.count === 0) {
      logger.debug('[StatsDB] 无需清理，没有超过 8 天的数据');
      return;
    }
    
    // 删除旧数据
    const deleteStmt = this.db.prepare('DELETE FROM requests WHERE timestamp < ?');
    const result = deleteStmt.run(eightDaysAgo);
    
    logger.info(`[StatsDB] 已清理 ${result.changes} 条超过 8 天的记录`);

    // 仅在删除大量记录时才 VACUUM（避免频繁锁定数据库）
    if (result.changes > 1000) {
      this.db.exec('VACUUM');
      logger.info('[StatsDB] VACUUM 完成，空间已回收');
    }

    // 清理对应的 daily_stats 数据
    const eightDaysAgoStr = new Date(eightDaysAgo).toISOString().slice(0, 10);
    const deleteDailyStmt = this.db.prepare('DELETE FROM daily_stats WHERE date < ?');
    deleteDailyStmt.run(eightDaysAgoStr);
  }
  
  /**
   * 迁移：添加新字段（如果不存在）
   */
  private migrateAddColumn(table: string, column: string, type: string): void {
    // 验证表名和列名（只允许字母、数字、下划线）
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table) || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column)) {
      logger.error(`[StatsDB] 迁移参数无效：${table}.${column}`);
      return;
    }

    try {
      const stmt = this.db.prepare(`
        SELECT COUNT(*) as count FROM pragma_table_info(?) WHERE name = ?
      `);
      const result = stmt.get(table, column) as { count: number };

      if (result.count === 0) {
        this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
        logger.info(`[StatsDB] 迁移完成：${table}.${column}`);
      }
    } catch (error) {
      logger.error(`[StatsDB] 迁移失败：${table}.${column}`, { error });
    }
  }

  /**
   * 插入请求记录
   */
  insertRequest(record: RequestRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO requests (id, timestamp, model, prompt_tokens, completion_tokens, total_tokens, duration, status, error_message, request_body, response_body, filter_markers, context_truncated, saved_tokens)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      record.id,
      record.timestamp,
      record.model,
      record.promptTokens,
      record.completionTokens,
      record.totalTokens,
      record.duration,
      record.status,
      record.errorMessage || null,
      record.requestBody || null,
      record.responseBody || null,
      record.filterMarkers ? JSON.stringify(record.filterMarkers) : null,
      record.contextTruncated ? 1 : 0,
      record.savedTokens || 0
    );
    
    // 如果触发隐私过滤，更新每日统计
    const filterMarkersStr = record.filterMarkers ? JSON.stringify(record.filterMarkers) : '';
    if (filterMarkersStr.includes('Privacy')) {
      this.incrementPrivacyFiltered(record.timestamp);
    }
    
    // 如果触发上下文裁切，更新每日统计和节省 Token
    if (record.contextTruncated) {
      this.incrementContextTruncated(record.timestamp, record.savedTokens || 0);
    }
  }
  
  /**
   * 增加隐私过滤计数
   */
  private incrementPrivacyFiltered(timestamp: number): void {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const stmt = this.db.prepare(`
      INSERT INTO daily_stats (date, privacy_filtered_count)
      VALUES (?, 1)
      ON CONFLICT(date) DO UPDATE SET
        privacy_filtered_count = privacy_filtered_count + 1
    `);
    
    stmt.run(dateStr);
  }
  
  /**
   * 增加上下文裁切计数和节省 Token
   */
  private incrementContextTruncated(timestamp: number, savedTokens: number): void {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // 检查 daily_stats 表是否有 context_truncated_count 和 saved_tokens 字段
    // 如果没有，先添加
    this.migrateAddColumn('daily_stats', 'context_truncated_count', 'INTEGER DEFAULT 0');
    this.migrateAddColumn('daily_stats', 'saved_tokens', 'INTEGER DEFAULT 0');
    
    const stmt = this.db.prepare(`
      INSERT INTO daily_stats (date, context_truncated_count, saved_tokens)
      VALUES (?, 1, ?)
      ON CONFLICT(date) DO UPDATE SET
        context_truncated_count = context_truncated_count + 1,
        saved_tokens = saved_tokens + excluded.saved_tokens
    `);
    
    stmt.run(dateStr, savedTokens);
  }

  /**
   * 批量插入（用于日志回放和异步写入队列）
   */
  insertBatch(records: RequestRecord[]): number {
    const insert = this.db.transaction((items: RequestRecord[]) => {
      const stmt = this.db.prepare(`
        INSERT OR IGNORE INTO requests (id, timestamp, model, prompt_tokens, completion_tokens, total_tokens, duration, status, error_message, request_body, response_body, filter_markers, context_truncated, saved_tokens)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const record of items) {
        stmt.run(
          record.id,
          record.timestamp,
          record.model,
          record.promptTokens,
          record.completionTokens,
          record.totalTokens,
          record.duration,
          record.status,
          record.errorMessage || null,
          record.requestBody || null,
          record.responseBody || null,
          record.filterMarkers ? JSON.stringify(record.filterMarkers) : null,
          record.contextTruncated ? 1 : 0,
          record.savedTokens || 0
        );

        // 同步更新 daily_stats（修复异步写入遗漏的统计）
        const filterMarkersStr = record.filterMarkers ? JSON.stringify(record.filterMarkers) : '';
        if (filterMarkersStr.includes('Privacy')) {
          this.incrementPrivacyFiltered(record.timestamp);
        }

        if (record.contextTruncated) {
          this.incrementContextTruncated(record.timestamp, record.savedTokens || 0);
        }
      }
    });

    try {
      insert(records);
      return records.length;
    } catch (error) {
      logger.error('[StatsDB] 批量插入失败', { error });
      return 0;
    }
  }

  /**
   * 获取今日统计（北京时间）
   */
  getTodayStats() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    return this.getDailyStats(today);
  }

  /**
   * 获取指定日期统计
   */
  getDailyStats(date: string) {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total_requests,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_requests,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_requests,
        SUM(prompt_tokens) as total_prompt_tokens,
        SUM(completion_tokens) as total_completion_tokens,
        SUM(total_tokens) as total_tokens,
        AVG(duration) as avg_duration
      FROM requests
      WHERE date(timestamp / 1000, 'unixepoch', 'localtime') = ?
    `);

    return stmt.get(date);
  }
  
  /**
   * 获取指定日期的隐私过滤计数
   */
  getPrivacyFilteredCount(date: string): number {
    const stmt = this.db.prepare(`
      SELECT privacy_filtered_count as count
      FROM daily_stats
      WHERE date = ?
    `);
    
    const result = stmt.get(date) as { count: number } | undefined;
    return result?.count || 0;
  }

  /**
   * 获取今日缓存统计（北京时间，duration=0 表示缓存命中）
   */
  getTodayCacheStats() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as cache_hits
      FROM requests
      WHERE date(timestamp / 1000, 'unixepoch', 'localtime') = ?
        AND duration = 0
    `);

    return stmt.get(today);
  }
  
  /**
   * 获取上下文裁切统计
   */
  getContextTruncatedStats(date: string): { context_truncated_count: number; saved_tokens: number } | undefined {
    const stmt = this.db.prepare(`
      SELECT context_truncated_count, saved_tokens
      FROM daily_stats
      WHERE date = ?
    `);
    
    return stmt.get(date) as { context_truncated_count: number; saved_tokens: number } | undefined;
  }

  /**
   * 获取最近N条请求
   */
  getRecentRequests(limit: number = 100): RequestRecord[] {
    const stmt = this.db.prepare(`
      SELECT 
        id, timestamp, model, prompt_tokens as promptTokens,
        completion_tokens as completionTokens, total_tokens as totalTokens,
        duration, status, error_message as errorMessage,
        request_body as requestBody, response_body as responseBody,
        filter_markers as filterMarkers
      FROM requests
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    const rows = stmt.all(limit) as LogSummaryRow[];
    // 解析 JSON 字符串
    return rows.map(row => ({
      ...row,
      filterMarkers: row.filterMarkers ? JSON.parse(row.filterMarkers) : undefined
    }));
  }

/**
 * 获取过去7天统计
 */
  getLast7DaysStats(): WeeklyStatsRow[] {
    const stmt = this.db.prepare(`
      SELECT 
        date(timestamp / 1000, 'unixepoch', 'localtime') as date,
        COUNT(*) as totalRequests,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successRequests,
        SUM(total_tokens) as totalTokens,
        AVG(duration) as avgDuration
      FROM requests
      WHERE timestamp >= ?
      GROUP BY date(timestamp / 1000, 'unixepoch', 'localtime')
      ORDER BY date
    `);

    // 6天前的0点 = 最近7天（含今天）
    const sixDaysAgo = Date.now() - 6 * 24 * 60 * 60 * 1000;
    const sixDaysAgoStart = new Date(sixDaysAgo).setHours(0, 0, 0, 0);
    return stmt.all(sixDaysAgoStart) as WeeklyStatsRow[];
  }

  /**
   * 获取总体统计
   */
  getOverallStats() {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total_requests,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_requests,
        SUM(total_tokens) as total_tokens,
        AVG(duration) as avg_duration
      FROM requests
    `);

    return stmt.get();
  }

  /**
   * 获取总体缓存统计（duration=0 表示缓存命中）
   */
  getOverallCacheStats() {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as cache_hits,
        SUM(total_tokens) as saved_tokens
      FROM requests
      WHERE duration = 0
    `);

    return stmt.get();
  }

  /**
   * 获取7天前的数据（用于归档）
   */
  getOldRecords(beforeTimestamp: number): RequestRecord[] {
    const stmt = this.db.prepare(`
      SELECT 
        id, timestamp, model, prompt_tokens as promptTokens,
        completion_tokens as completionTokens, total_tokens as totalTokens,
        duration, status, error_message as errorMessage
      FROM requests
      WHERE timestamp < ?
      ORDER BY timestamp
    `);

    return stmt.all(beforeTimestamp) as RequestRecord[];
  }

  /**
   * 删除指定时间之前的数据
   */
  deleteOldRecords(beforeTimestamp: number): number {
    const stmt = this.db.prepare('DELETE FROM requests WHERE timestamp < ?');
    const result = stmt.run(beforeTimestamp);
    return result.changes;
  }

  /**
   * 获取最近 N 条请求摘要（不包含 requestBody/responseBody）
   */
    getRecentLogsSummary(limit: number = 100, before?: number, today?: boolean): LogSummaryRow[] {
    // 计算今日开始时间戳
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    let sql = `
      SELECT
        id, timestamp, model, prompt_tokens as promptTokens,
        completion_tokens as completionTokens, total_tokens as totalTokens,
        duration, status, error_message as errorMessage,
        filter_markers as filterMarkers
      FROM requests
    `;

    // 构建 WHERE 条件
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (today) {
      conditions.push('timestamp >= ?');
      params.push(todayStart);
    }

    if (before !== undefined) {
      conditions.push('timestamp < ?');
      params.push(before);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as LogSummaryRow[];

    return rows.map(row => ({
      ...row,
      filterMarkers: row.filterMarkers ? JSON.parse(row.filterMarkers) : undefined
    }));
  }

  /**
   * 执行单行查询（通用方法）
   * @param sql SQL 语句
   * @param params 参数
   * @returns 查询结果或 undefined
   */
  queryOne(sql: string, ...params: unknown[]): unknown | undefined {
    const stmt = this.db.prepare(sql);
    return stmt.get(...params);
  }

  close(): void {
    this.db.close();
    logger.info('[StatsDB] 数据库已关闭');
  }
}
