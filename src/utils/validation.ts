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
 * Savor - 输入验证中间件
 * 基于 Zod 的请求验证
 */

import { Request, Response, NextFunction } from 'express';
import { ZodObject, ZodError, ZodTypeAny } from 'zod';
import { ValidationError } from './errors.js';

type ZodSchema = ZodObject<Record<string, ZodTypeAny>>;

/**
 * Zod 验证中间件
 * 验证请求体、查询参数、路径参数
 */
export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        next(new ValidationError('验证失败', errors));
      } else {
        next(error);
      }
    }
  };
};

/**
 * 可选验证（不阻止请求，只记录警告）
 */
export const optionalValidate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        console.warn('[Validation Warning] 请求验证失败但已放行:', error.issues);
      }
    }
    next();
  };
};