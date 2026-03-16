/**
 * Savor - 全链路追踪日志模块
 * 记录完整的请求/响应数据流，用于调试和数据分析
 */

import fs from 'fs';
import path from 'path';
import { logger } from './logger.js';

export interface TraceStep {
  step: number;           // 步骤序号 1-4
  direction: 'in' | 'out'; // 方向：接收/发送
  source: string;         // 来源/目标标识
  timestamp: number;      // 时间戳
  data: any;              // 完整数据内容
}

export interface TraceRecord {
  traceId: string;        // 追踪ID（与请求ID一致）
  timestamp: number;      // 开始时间戳
  model?: string;         // 模型名称
  steps: TraceStep[];     // 四个步骤的数据
}

export class TraceLogger {
  private enabled: boolean;
  private traceDir: string;
  private maxFileSize: number;
  private currentFile: string | null = null;
  private currentSize: number = 0;
  private fileIndex: number = 0;
  private writeStream: fs.WriteStream | null = null;

  constructor(enabled: boolean, traceDir: string, maxFileSize: number) {
    this.enabled = enabled;
    this.traceDir = traceDir;
    this.maxFileSize = maxFileSize;

    if (enabled) {
      this.init();
    }
  }

  /**
   * 初始化追踪目录和文件
   */
  private init(): void {
    try {
      // 确保目录存在
      if (!fs.existsSync(this.traceDir)) {
        fs.mkdirSync(this.traceDir, { recursive: true });
        logger.info(`[Trace] 创建追踪目录: ${this.traceDir}`);
      }

      // 查找现有文件，确定下一个文件索引
      this.determineNextFileIndex();
      
      // 打开新文件
      this.openNewFile();
      
      logger.info('[Trace] 全链路追踪已启用');
    } catch (error) {
      logger.error('[Trace] 初始化失败', { error });
      this.enabled = false;
    }
  }

  /**
   * 确定下一个文件索引
   */
  private determineNextFileIndex(): void {
    const date = new Date().toISOString().split('T')[0];
    const pattern = new RegExp(`^trace-${date}-(\\d+)\\.jsonl$`);
    
    let maxIndex = 0;
    
    try {
      const files = fs.readdirSync(this.traceDir);
      for (const file of files) {
        const match = file.match(pattern);
        if (match) {
          const index = parseInt(match[1], 10);
          if (index > maxIndex) {
            maxIndex = index;
          }
        }
      }
    } catch (error) {
      // 目录可能不存在，忽略错误
    }
    
    this.fileIndex = maxIndex;
  }

  /**
   * 打开新的日志文件
   */
  private openNewFile(): void {
    // 关闭旧文件
    if (this.writeStream) {
      this.writeStream.end();
    }

    // 生成新文件名
    const date = new Date().toISOString().split('T')[0];
    this.fileIndex++;
    this.currentFile = path.join(this.traceDir, `trace-${date}-${this.fileIndex}.jsonl`);
    this.currentSize = 0;

    // 创建写入流
    this.writeStream = fs.createWriteStream(this.currentFile, { flags: 'a' });
    
    logger.info(`[Trace] 新建追踪文件: ${this.currentFile}`);
  }

  /**
   * 检查是否需要切换文件
   */
  private checkRotation(dataSize: number): void {
    if (this.currentSize + dataSize > this.maxFileSize) {
      this.openNewFile();
    }
  }

  /**
   * 记录单个步骤
   */
  logStep(traceId: string, step: TraceStep): void {
    if (!this.enabled || !this.writeStream) return;

    try {
      // 使用扁平结构，每个步骤单独一行
      const record = {
        traceId,
        timestamp: step.timestamp,
        stepNumber: step.step,
        direction: step.direction,
        source: step.source,
        data: step.data
      };

      const line = JSON.stringify(record) + '\n';
      this.checkRotation(Buffer.byteLength(line, 'utf8'));
      
      this.writeStream.write(line);
      this.currentSize += Buffer.byteLength(line, 'utf8');
    } catch (error) {
      logger.error('[Trace] 写入失败', { error, traceId, step: step.step });
    }
  }

  /**
   * 记录完整追踪（四个步骤合并）
   */
  logComplete(record: TraceRecord): void {
    if (!this.enabled || !this.writeStream) return;

    try {
      // 将完整记录作为单行写入
      const line = JSON.stringify(record) + '\n';
      this.checkRotation(Buffer.byteLength(line, 'utf8'));
      
      this.writeStream.write(line);
      this.currentSize += Buffer.byteLength(line, 'utf8');
    } catch (error) {
      logger.error('[Trace] 写入完整记录失败', { error, traceId: record.traceId });
    }
  }

  /**
   * 关闭追踪器
   */
  close(): void {
    if (this.writeStream) {
      this.writeStream.end();
      this.writeStream = null;
    }
    logger.info('[Trace] 追踪器已关闭');
  }
}

// 全局实例
let traceLogger: TraceLogger | null = null;

/**
 * 初始化追踪器
 */
export function initTraceLogger(enabled: boolean, traceDir: string, maxFileSize: number): void {
  traceLogger = new TraceLogger(enabled, traceDir, maxFileSize);
}

/**
 * 获取追踪器实例
 */
export function getTraceLogger(): TraceLogger | null {
  return traceLogger;
}

/**
 * 设置全局追踪器实例
 */
export function setTraceLogger(logger: TraceLogger): void {
  traceLogger = logger;
}

/**
 * 记录步骤（便捷函数）
 */
export function traceStep(traceId: string, step: TraceStep): void {
  traceLogger?.logStep(traceId, step);
}
