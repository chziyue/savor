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
 * Savor - Cyber Dark Theme / 赛博朋克暗色主题
 * 深色科技风格，霓虹光效
 */

import type { Theme } from './types.js';
import { COMMON_RADIUS_FULL, COMMON_RADIUS_NAV, COMMON_RADIUS_CARD_LG, COMMON_ANIMATION } from './constants.js';

export const cyberTheme: Theme = {
  id: 'cyber',
  name: 'Cyber Dark',
  description: '深色赛博朋克风格，霓虹光效与扫描线',
  
  colors: {
    // 背景
    bgPrimary: '#0a0a0f',
    bgSecondary: '#1a1a2e',
    bgCard: 'rgba(20, 20, 35, 0.8)',
    bgCardHover: 'rgba(30, 30, 50, 0.9)',
    
    // 文字
    textPrimary: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    textTertiary: 'rgba(255, 255, 255, 0.5)',
    textInverse: '#0a0a0f',
    
    // 强调色
    accentPrimary: '#00f5ff',
    accentPrimaryBg: 'rgba(0, 245, 255, 0.1)',
    accentSecondary: '#ff00ff',
    accentTertiary: '#b829dd',
    
    // 功能色
    colorSuccess: '#00ff88',
    colorSuccessBg: 'rgba(0, 255, 136, 0.1)',
    colorWarning: '#ffaa00',
    colorWarningBg: 'rgba(255, 170, 0, 0.1)',
    colorError: '#ff00ff',
    colorErrorBg: 'rgba(255, 0, 255, 0.1)',
    
    // 边框
    borderDefault: 'rgba(0, 245, 255, 0.3)',
    borderSubtle: 'rgba(0, 245, 255, 0.1)',
    borderStrong: 'rgba(0, 245, 255, 0.5)',
    
    // 阴影
    shadowSm: 'rgba(0, 245, 255, 0.05) 0px 1px 2px',
    shadowMd: 'rgba(0, 245, 255, 0.1) 0px 2px 8px',
    shadowLg: 'rgba(0, 245, 255, 0.2) 0px 2px 16px',
    shadowInset: 'rgba(0, 245, 255, 0.1) 0px 1px 0px inset',
    
    // 毛玻璃
    glassBg: 'rgba(20, 20, 35, 0.8)',
    glassBlur: '10px',
    glassSaturate: '100%',
    
    // 圆角
    radiusFull: COMMON_RADIUS_FULL,
    radiusNav: COMMON_RADIUS_NAV,
    radiusCardLg: COMMON_RADIUS_CARD_LG,
    radiusCardMd: '15px',
    radiusCardSm: '12px',
    
    // 动效
    easeOutExpo: COMMON_ANIMATION.easeOutExpo,
    easeOutQuart: COMMON_ANIMATION.easeOutQuart,
    durationFast: COMMON_ANIMATION.durationFast,
    durationNormal: COMMON_ANIMATION.durationNormal,
    durationSlow: COMMON_ANIMATION.durationSlow,
  },
  
  effects: {
    backgroundGradient: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)',
    scanline: true,
    neonGlow: true,
    orbs: [
      {
        id: 'orb-cyan',
        color: 'rgba(0, 245, 255, 0.15)',
        position: { x: '10%', y: '20%' },
        size: '400px',
        opacity: 0.3,
      },
      {
        id: 'orb-pink',
        color: 'rgba(255, 0, 255, 0.1)',
        position: { x: '80%', y: '60%' },
        size: '300px',
        opacity: 0.2,
      },
    ],
  },
  
  fonts: {
    heading: "'Orbitron', monospace",
    body: "'Rajdhani', sans-serif",
    mono: "'Courier New', monospace",
  },
};