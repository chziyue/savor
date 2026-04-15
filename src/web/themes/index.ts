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
 * Savor - Theme Manager / 主题管理器
 */

import type { Theme, ThemeId } from './types.js';
import { cyberTheme } from './cyber.js';
import { glassLightTheme } from './glass-light.js';
import { COMMON_RADIUS_FULL, COMMON_RADIUS_NAV, COMMON_RADIUS_CARD_LG, COMMON_ANIMATION, ORB_BLUR_RADIUS } from './constants.js';

// 重新导出共享常量
export { COMMON_RADIUS_FULL, COMMON_RADIUS_NAV, COMMON_RADIUS_CARD_LG, COMMON_ANIMATION, ORB_BLUR_RADIUS };

// 所有可用主题
export const themes: Record<ThemeId, Theme> = {
  'cyber': cyberTheme,
  'glass': glassLightTheme,
};

// 默认主题
export const defaultThemeId: ThemeId = 'cyber';

/**
 * 获取主题
 */
export function getTheme(themeId: ThemeId): Theme {
  return themes[themeId] || themes[defaultThemeId];
}

/**
 * 获取所有主题列表
 */
export function getAllThemes(): Theme[] {
  return Object.values(themes);
}

/**
 * 生成 CSS 变量字符串
 */
export function generateThemeCSS(theme: Theme): string {
  const { colors, effects, fonts } = theme;
  
  // 基础 CSS 变量
  const cssVars = `
    /* 背景 */
    --bg-primary: ${colors.bgPrimary};
    --bg-secondary: ${colors.bgSecondary};
    --bg-card: ${colors.bgCard};
    --bg-card-hover: ${colors.bgCardHover};
    
    /* 文字 */
    --text-primary: ${colors.textPrimary};
    --text-secondary: ${colors.textSecondary};
    --text-tertiary: ${colors.textTertiary};
    --text-inverse: ${colors.textInverse};
    
    /* 强调色 */
    --accent-primary: ${colors.accentPrimary};
    --accent-primary-bg: ${colors.accentPrimaryBg};
    --accent-secondary: ${colors.accentSecondary};
    --accent-tertiary: ${colors.accentTertiary};
    
    /* 功能色 */
    --color-success: ${colors.colorSuccess};
    --color-success-bg: ${colors.colorSuccessBg};
    --color-warning: ${colors.colorWarning};
    --color-warning-bg: ${colors.colorWarningBg};
    --color-error: ${colors.colorError};
    --color-error-bg: ${colors.colorErrorBg};
    
    /* 边框 */
    --border-default: ${colors.borderDefault};
    --border-subtle: ${colors.borderSubtle};
    --border-strong: ${colors.borderStrong};
    
    /* 阴影 */
    --shadow-sm: ${colors.shadowSm};
    --shadow-md: ${colors.shadowMd};
    --shadow-lg: ${colors.shadowLg};
    --shadow-inset: ${colors.shadowInset};
    
    /* 毛玻璃 */
    --glass-bg: ${colors.glassBg};
    --glass-blur: ${colors.glassBlur};
    --glass-saturate: ${colors.glassSaturate};
    
    /* 圆角 */
    --radius-full: ${colors.radiusFull};
    --radius-nav: ${colors.radiusNav};
    --radius-card-lg: ${colors.radiusCardLg};
    --radius-card-md: ${colors.radiusCardMd};
    --radius-card-sm: ${colors.radiusCardSm};
    
    /* 动效 */
    --ease-out-expo: ${colors.easeOutExpo};
    --ease-out-quart: ${colors.easeOutQuart};
    --duration-fast: ${colors.durationFast};
    --duration-normal: ${colors.durationNormal};
    --duration-slow: ${colors.durationSlow};
    
    /* 字体 */
    --font-heading: ${fonts.heading};
    --font-body: ${fonts.body};
    --font-mono: ${fonts.mono};
    
    /* 效果 */
    --bg-gradient: ${effects.backgroundGradient || 'none'};
    --scanline: ${effects.scanline ? '1' : '0'};
    --neon-glow: ${effects.neonGlow ? '1' : '0'};
  `;
  
  return cssVars;
}

/**
 * 生成光晕装饰 CSS
 */
export function generateOrbsCSS(theme: Theme): string {
  if (!theme.effects.orbs || theme.effects.orbs.length === 0) {
    return '';
  }
  
  return theme.effects.orbs.map(orb => {
    return `
    .orb-${orb.id} {
      position: fixed;
      border-radius: 50%;
      width: ${orb.size};
      height: ${orb.size};
      left: ${orb.position.x};
      top: ${orb.position.y};
      background: radial-gradient(circle, 
        ${orb.color} 0%, 
        transparent 70%);
      filter: blur(${ORB_BLUR_RADIUS});
      opacity: ${orb.opacity};
      pointer-events: none;
      z-index: 0;
    }`;
  }).join('\n');
}

/**
 * 生成完整主题样式
 */
export function generateThemeStyles(themeId: ThemeId): string {
  const theme = getTheme(themeId);
  const cssVars = generateThemeCSS(theme);
  const orbsCSS = generateOrbsCSS(theme);
  
  return `
    :root {
      ${cssVars}
    }
    
    /* 光晕装饰 */
    ${orbsCSS}
  `;
}

export type { Theme, ThemeId, ThemeColors, ThemeEffects, ThemeOrb } from './types.js';