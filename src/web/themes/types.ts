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
 * Savor - Theme Types / 主题类型定义
 */

export interface ThemeColors {
  // 背景
  bgPrimary: string;
  bgSecondary: string;
  bgCard: string;
  bgCardHover: string;
  
  // 文字
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  
  // 强调色
  accentPrimary: string;
  accentPrimaryBg: string;
  accentSecondary: string;
  accentTertiary: string;
  
  // 功能色
  colorSuccess: string;
  colorSuccessBg: string;
  colorWarning: string;
  colorWarningBg: string;
  colorError: string;
  colorErrorBg: string;
  
  // 边框
  borderDefault: string;
  borderSubtle: string;
  borderStrong: string;
  
  // 阴影
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
  shadowInset: string;
  
  // 毛玻璃
  glassBg: string;
  glassBlur: string;
  glassSaturate: string;
  
  // 圆角
  radiusFull: string;
  radiusNav: string;
  radiusCardLg: string;
  radiusCardMd: string;
  radiusCardSm: string;
  
  // 动效
  easeOutExpo: string;
  easeOutQuart: string;
  durationFast: string;
  durationNormal: string;
  durationSlow: string;
}

export interface ThemeEffects {
  // 背景渐变
  backgroundGradient?: string;
  // 扫描线效果
  scanline?: boolean;
  // 霓虹发光
  neonGlow?: boolean;
  // 光晕装饰
  orbs?: ThemeOrb[];
}

export interface ThemeOrb {
  id: string;
  color: string;
  position: { x: string; y: string };
  size: string;
  opacity: number;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
  effects: ThemeEffects;
  fonts: {
    heading: string;
    body: string;
    mono: string;
  };
}

export type ThemeId = 'cyber' | 'glass';