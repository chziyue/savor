/**
 * Savor - 全局错误处理中间件
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from './errors.js';
import { logger } from './logger.js';

/**
 * 全局错误处理器
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // 已知的应用错误
  if (err instanceof AppError) {
    const response: any = {
      status: 'error',
      message: err.message,
    };

    // 验证错误附加详细错误信息
    const appErr = err as any;
    if (appErr.errors && Array.isArray(appErr.errors)) {
      response.errors = appErr.errors;
    }

    return res.status(err.statusCode).json(response);
  }

  // 未知错误
  logger.error('未处理的错误', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body ? JSON.stringify(req.body).slice(0, 500) : undefined,
  });

  // 生产环境不暴露错误详情
  const message =
    process.env.NODE_ENV === 'production'
      ? '服务器内部错误'
      : err.message;

  res.status(500).json({
    status: 'error',
    message,
  });
};

/**
 * 异步处理器包装
 * 自动捕获异步错误并传递给错误处理中间件
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 处理器
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: `路由未找到: ${req.method} ${req.path}`,
  });
};