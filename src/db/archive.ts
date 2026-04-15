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
 * Savor - Archive Module
 * 每日归档超过7天的历史数据
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger.js';
import { StatsDatabase, RequestRecord } from './sqlite.js';

export class ArchiveManager {
  private archiveDir: string;
  private retentionDays: number;

  constructor(archiveDir: string = './data/archive', retentionDays: number = 7) {
    this.archiveDir = archiveDir;
    this.retentionDays = retentionDays;

    // 确保归档目录存在
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }
  }

  /**
   * 执行每日归档
   * @returns 归档结果
   */
  async archive(): Promise<{ archived: number; deleted: number; file: string }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
    const cutoffTimestamp = cutoffDate.getTime();

    const dateStr = cutoffDate.toISOString().split('T')[0].replace(/-/g, '');
    const archiveFileName = `archive_${dateStr}.db`;
    const archivePath = path.join(this.archiveDir, archiveFileName);

    logger.info('[Archive] 开始归档', { 
      cutoffDate: cutoffDate.toISOString(),
      archiveFile: archiveFileName 
    });

    // 连接主库
    const mainDb = new StatsDatabase();

    try {
      // 获取需要归档的数据
      const oldRecords = mainDb.getOldRecords(cutoffTimestamp);
      
      if (oldRecords.length === 0) {
        logger.info('[Archive] 没有需要归档的数据');
        return { archived: 0, deleted: 0, file: '' };
      }

      // 创建归档库
      this.createArchiveDb(archivePath, oldRecords);

      // 从主库删除已归档数据
      const deleted = mainDb.deleteOldRecords(cutoffTimestamp);

      // 清理空数据库文件
      this.vacuumMainDb();

      logger.info('[Archive] 归档完成', {
        archived: oldRecords.length,
        deleted,
        file: archivePath
      });

      return {
        archived: oldRecords.length,
        deleted,
        file: archivePath
      };

    } finally {
      mainDb.close();
    }
  }

  /**
   * 创建归档数据库
   */
  private createArchiveDb(dbPath: string, records: RequestRecord[]): void {
    // 如果文件已存在，先删除
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }

    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');

    // 创建表结构（与主库相同）
    db.exec(`
      CREATE TABLE requests (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        model TEXT NOT NULL,
        prompt_tokens INTEGER DEFAULT 0,
        completion_tokens INTEGER DEFAULT 0,
        total_tokens INTEGER DEFAULT 0,
        duration INTEGER DEFAULT 0,
        status TEXT CHECK(status IN ('success', 'error')),
        error_message TEXT
      );
      CREATE INDEX idx_requests_timestamp ON requests(timestamp);
    `);

    // 批量插入数据
    const insert = db.transaction((items: RequestRecord[]) => {
      const stmt = db.prepare(`
        INSERT INTO requests (id, timestamp, model, prompt_tokens, completion_tokens, total_tokens, duration, status, error_message)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          record.errorMessage || null
        );
      }
    });

    insert(records);
    db.close();

    logger.debug('[Archive] 归档库创建完成', { 
      file: dbPath, 
      records: records.length 
    });
  }

  /**
   * 加载指定日期的归档数据
   */
  loadArchive(dateStr: string): StatsDatabase | null {
    const archivePath = path.join(this.archiveDir, `archive_${dateStr}.db`);
    
    if (!fs.existsSync(archivePath)) {
      return null;
    }

    return new StatsDatabase(archivePath);
  }

  /**
   * 列出所有归档文件
   */
  listArchives(): string[] {
    if (!fs.existsSync(this.archiveDir)) {
      return [];
    }

    return fs.readdirSync(this.archiveDir)
      .filter(f => f.startsWith('archive_') && f.endsWith('.db'))
      .sort();
  }

  /**
   * 清理主库空间
   */
  private vacuumMainDb(): void {
    try {
      const db = new Database('./data/stats.db');
      db.exec('VACUUM');
      db.close();
      logger.debug('[Archive] 主库已清理');
    } catch (error) {
      logger.warn('[Archive] 主库清理失败', { error });
    }
  }

  /**
   * 设置定时归档任务
   */
  scheduleDailyArchive(hour: number = 2, minute: number = 0): void {
    const now = new Date();
    const nextRun = new Date();
    nextRun.setHours(hour, minute, 0, 0);
    
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    const delay = nextRun.getTime() - now.getTime();

    setTimeout(() => {
      this.archive();
      // 之后每24小时执行一次
      setInterval(() => this.archive(), 24 * 60 * 60 * 1000);
    }, delay);

    logger.info('[Archive] 定时归档已设置', { 
      nextRun: nextRun.toISOString() 
    });
  }
}
