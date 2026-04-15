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
 * Savor - 自定义错误类
 * 基于最佳实践，提供统一的错误处理
 */

/**
 * 基础应用错误类
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 验证错误（400）
 */
export class ValidationError extends AppError {
  public readonly errors?: Array<{ field: string; message: string }>;

  constructor(
    message: string = '验证失败',
    errors?: Array<{ field: string; message: string }>
  ) {
    super(message, 400, true);
    this.errors = errors;
  }
}

/**
 * 未找到错误（404）
 */
export class NotFoundError extends AppError {
  constructor(message: string = '资源未找到') {
    super(message, 404, true);
  }
}

/**
 * 未授权错误（401）
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = '未授权') {
    super(message, 401, true);
  }
}

/**
 * 禁止访问错误（403）
 */
export class ForbiddenError extends AppError {
  constructor(message: string = '禁止访问') {
    super(message, 403, true);
  }
}

/**
 * 冲突错误（409）
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, true);
  }
}

/**
 * 请求过多错误（429）
 */
export class TooManyRequestsError extends AppError {
  constructor(message: string = '请求过多，请稍后再试') {
    super(message, 429, true);
  }
}

/**
 * 上游服务错误（502）
 */
export class BadGatewayError extends AppError {
  constructor(message: string = '上游服务错误') {
    super(message, 502, true);
  }
}

/**
 * 服务不可用错误（503）
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = '服务暂时不可用') {
    super(message, 503, true);
  }
}