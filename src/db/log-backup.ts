/**
 * Savor - Log Backup Module
 * JSON Lines 格式操作日志，用于兜底恢复和审计
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { logger } from '../utils/logger.js';
import { RequestRecord } from './sqlite.js';

export class LogBackup {
  private logDir: string;
  private currentLogFile: string;
  private writeStream: fs.WriteStream | null = null;

  constructor(logDir: string = './logs') {
    this.logDir = logDir;
    this.currentLogFile = this.getTodayLogFile();

    // 确保目录存在
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // 初始化写入流
    this.initWriteStream();

    logger.info('[LogBackup] 日志备份已初始化', { logFile: this.currentLogFile });
  }

  /**
   * 获取今日日志文件路径
   */
  private getTodayLogFile(): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `cost-${date}.log`);
  }

  /**
   * 初始化写入流
   */
  private initWriteStream(): void {
    // 如果日期变了，切换文件
    const todayFile = this.getTodayLogFile();
    if (todayFile !== this.currentLogFile) {
      this.close();
      this.currentLogFile = todayFile;
    }

    this.writeStream = fs.createWriteStream(this.currentLogFile, { flags: 'a' });
    
    // 错误处理
    this.writeStream.on('error', (err) => {
      logger.error('[LogBackup] 写入流错误', { error: err.message });
    });
  }

  /**
   * 记录请求到日志
   */
  append(record: RequestRecord): boolean {
    try {
      // 检查是否需要切换日期
      const todayFile = this.getTodayLogFile();
      if (todayFile !== this.currentLogFile) {
        this.initWriteStream();
      }

      const line = JSON.stringify({
        ...record,
        _logged_at: Date.now()
      }) + '\n';

      this.writeStream?.write(line);
      return true;
    } catch (error) {
      logger.error('[LogBackup] 写入失败', { error });
      return false;
    }
  }

  /**
   * 批量追加
   */
  appendBatch(records: RequestRecord[]): number {
    let success = 0;
    for (const record of records) {
      if (this.append(record)) success++;
    }
    return success;
  }

  /**
   * 从日志回放恢复数据
   * @param days 恢复最近N天的日志
   */
  async replay(days: number = 7): Promise<RequestRecord[]> {
    const records: RequestRecord[] = [];
    const logFiles = this.getRecentLogFiles(days);

    logger.info('[LogBackup] 开始回放日志', { files: logFiles.length });

    for (const file of logFiles) {
      const fileRecords = await this.parseLogFile(file);
      records.push(...fileRecords);
    }

    logger.info('[LogBackup] 日志回放完成', { totalRecords: records.length });
    return records;
  }

  /**
   * 解析单个日志文件
   */
  private parseLogFile(filePath: string): Promise<RequestRecord[]> {
    return new Promise((resolve, reject) => {
      const records: RequestRecord[] = [];
      const stream = fs.createReadStream(filePath);
      const rl = readline.createInterface({ input: stream });

      rl.on('line', (line) => {
        try {
          if (line.trim()) {
            const data = JSON.parse(line);
            records.push({
              id: data.id,
              timestamp: data.timestamp,
              model: data.model,
              promptTokens: data.promptTokens,
              completionTokens: data.completionTokens,
              totalTokens: data.totalTokens,
              duration: data.duration,
              status: data.status,
              errorMessage: data.errorMessage
            });
          }
        } catch (e) {
          logger.warn('[LogBackup] 解析日志行失败', { line: line.slice(0, 100) });
        }
      });

      rl.on('close', () => resolve(records));
      rl.on('error', reject);
    });
  }

  /**
   * 获取最近N天的日志文件
   */
  private getRecentLogFiles(days: number): string[] {
    const files: string[] = [];
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const filePath = path.join(this.logDir, `cost-${dateStr}.log`);

      if (fs.existsSync(filePath)) {
        files.push(filePath);
      }
    }

    return files.reverse(); // 按日期正序
  }

  /**
   * 列出所有日志文件
   */
  listLogFiles(): string[] {
    if (!fs.existsSync(this.logDir)) {
      return [];
    }

    return fs.readdirSync(this.logDir)
      .filter(f => f.startsWith('cost-') && f.endsWith('.log'))
      .sort();
  }

  /**
   * 获取日志统计
   */
  getStats(): { totalFiles: number; totalSize: number } {
    const files = this.listLogFiles();
    let totalSize = 0;

    for (const file of files) {
      const stat = fs.statSync(path.join(this.logDir, file));
      totalSize += stat.size;
    }

    return { totalFiles: files.length, totalSize };
  }

  /**
   * 关闭写入流
   */
  close(): void {
    if (this.writeStream) {
      this.writeStream.end();
      this.writeStream = null;
    }
  }
}
