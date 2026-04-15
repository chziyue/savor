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
 * Savor - 主题共享常量
 */

/** 圆角 - 全宽元素 */
export const COMMON_RADIUS_FULL = '980px';
export const COMMON_RADIUS_NAV = '24px';
export const COMMON_RADIUS_CARD_LG = '20px';

/** 动效配置 */
export const COMMON_ANIMATION = {
  easeOutExpo: 'cubic-bezier(0.16, 1, 0.3, 1)',
  easeOutQuart: 'cubic-bezier(0.25, 1, 0.5, 1)',
  durationFast: '0.25s',
  durationNormal: '0.5s',
  durationSlow: '0.85s',
} as const;

/** 光晕模糊半径 */
export const ORB_BLUR_RADIUS = '40px';