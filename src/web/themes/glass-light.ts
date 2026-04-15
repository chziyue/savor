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
 * Savor - Glass Light Theme / 毛玻璃浅色主题
 * Apple 设计语言，现代毛玻璃风格
 */

import type { Theme } from './types.js';
import { COMMON_RADIUS_FULL, COMMON_RADIUS_NAV, COMMON_RADIUS_CARD_LG, COMMON_ANIMATION } from './constants.js';

export const glassLightTheme: Theme = {
  id: 'glass',
  name: 'Glass',
  description: 'Apple 设计风格，毛玻璃效果，清新明亮',
  
  colors: {
    // 背景
    bgPrimary: '#ffffff',
    bgSecondary: '#f5f5f7',
    bgCard: 'rgba(255, 255, 255, 0.7)',
    bgCardHover: 'rgba(255, 255, 255, 0.88)',
    
    // 文字
    textPrimary: 'rgb(28, 28, 30)',
    textSecondary: 'rgb(58, 58, 60)',
    textTertiary: 'rgb(108, 108, 112)',
    textInverse: '#ffffff',
    
    // 强调色
    accentPrimary: 'rgb(0, 122, 255)',
    accentPrimaryBg: 'rgba(0, 122, 255, 0.1)',
    accentSecondary: 'rgb(175, 82, 222)',
    accentTertiary: 'rgb(50, 173, 230)',
    
    // 功能色
    colorSuccess: 'rgb(52, 199, 89)',
    colorSuccessBg: 'rgba(52, 199, 89, 0.1)',
    colorWarning: 'rgb(255, 149, 0)',
    colorWarningBg: 'rgba(255, 149, 0, 0.1)',
    colorError: 'rgb(255, 45, 85)',
    colorErrorBg: 'rgba(255, 45, 85, 0.1)',
    
    // 边框
    borderDefault: 'rgba(255, 255, 255, 0.9)',
    borderSubtle: 'rgba(116, 116, 128, 0.1)',
    borderStrong: 'rgb(199, 199, 204)',
    
    // 阴影
    shadowSm: 'rgba(0, 0, 0, 0.03) 0px 1px 2px',
    shadowMd: 'rgba(0, 0, 0, 0.06) 0px 2px 8px',
    shadowLg: 'rgba(0, 0, 0, 0.06) 0px 2px 16px',
    shadowInset: 'rgba(255, 255, 255, 0.95) 0px 1px 0px inset',
    
    // 毛玻璃
    glassBg: 'rgba(255, 255, 255, 0.55)',
    glassBlur: '28px',
    glassSaturate: '180%',
    
    // 圆角
    radiusFull: COMMON_RADIUS_FULL,
    radiusNav: COMMON_RADIUS_NAV,
    radiusCardLg: COMMON_RADIUS_CARD_LG,
    radiusCardMd: '14px',
    radiusCardSm: '10px',
    
    // 动效
    easeOutExpo: COMMON_ANIMATION.easeOutExpo,
    easeOutQuart: COMMON_ANIMATION.easeOutQuart,
    durationFast: COMMON_ANIMATION.durationFast,
    durationNormal: COMMON_ANIMATION.durationNormal,
    durationSlow: COMMON_ANIMATION.durationSlow,
  },
  
  effects: {
    backgroundGradient: 'linear-gradient(180deg, #f5f5f7 0%, #ffffff 50%, #f0f0f5 100%)',
    scanline: false,
    neonGlow: false,
    orbs: [
      {
        id: 'orb-blue',
        color: 'rgba(0, 122, 255, 0.15)',
        position: { x: '-10%', y: '-10%' },
        size: '660px',
        opacity: 0.4,
      },
      {
        id: 'orb-purple',
        color: 'rgba(175, 82, 222, 0.12)',
        position: { x: '90%', y: '-5%' },
        size: '500px',
        opacity: 0.3,
      },
      {
        id: 'orb-green',
        color: 'rgba(52, 199, 89, 0.09)',
        position: { x: '50%', y: '100%' },
        size: '600px',
        opacity: 0.25,
      },
    ],
  },
  
  fonts: {
    heading: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    body: "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'SF Mono', 'Fira Code', 'Consolas', monospace",
  },
};