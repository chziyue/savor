/**
 * Savor - Configuration Module
 * Loads config.js from root directory, falls back to defaults
 */

import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

// ==================== Default Configuration ====================

const defaultConfig = {
  // Common configuration
  upstream: 'https://api.example.com/v1',
  port: 3456,
  host: '0.0.0.0',
  modelOverride: {
    enabled: false,
    model: ''
  },
  apiKeyOverride: {
    enabled: false,
    apiKey: ''
  },
  cors: {
    allowedOrigins: ['http://localhost:3456', 'http://127.0.0.1:3456'],
    credentials: true,
    maxAge: 86400
  },
  https: {
    enabled: false,
    port: 3457,
    keyPath: './certs/key.pem',
    certPath: './certs/cert.pem'
  },

  // Advanced configuration
  features: {
    stats: true,
    rateLimit: true,
    webDashboard: true,
    loopGuard: true
  },
  contextTruncation: {
    enabled: false,
    maxRounds: 20
  },
  contentFilter: {
    enabled: true,
    categories: { privacy: true },
    replacements: { privacy: '<privacy-filtered>' }
  },
  loopGuardConfig: {
    cacheAfter: 2,
    stopAfter: 4,
    countWindow: 60000,
    cacheTtl: 300000
  },
  rateLimitConfig: {
    requestsPerMinute: 20,
    windowMs: 60000,
    permanentLock: 60
  },
  logLevel: 'info',
  logDir: './logs',
  timeout: { upstream: 60000 },
  dashboard: { refreshInterval: 5000 },
  tokenEstimation: {
    chineseChar: 1.8,
    englishChar: 0.5,
    digitChar: 0.3,
    jsonStructChar: 1.3
  },
  fullTrace: {
    enabled: false,
    traceDir: './traces',
    maxFileSize: 100 * 1024 * 1024
  }
};

// ==================== Type Definitions ====================

export interface SavorConfig {
  upstream: string;
  port: number;
  host: string;
  logLevel: string;
  logDir: string;
  modelOverride?: { enabled: boolean; model: string };
  apiKeyOverride?: { enabled: boolean; apiKey: string };
  cors?: {
    allowedOrigins: string[];
    credentials: boolean;
    maxAge: number;
  };
  https?: {
    enabled: boolean;
    port: number;
    keyPath: string;
    certPath: string;
  };
  features: {
    stats: boolean;
    rateLimit: boolean;
    webDashboard: boolean;
    loopGuard?: boolean;
  };
  loopGuardConfig?: {
    cacheAfter: number;
    stopAfter: number;
    countWindow: number;
    cacheTtl: number;
  };
  rateLimitConfig?: {
    requestsPerMinute: number;
    windowMs?: number;
    permanentLock?: boolean | number;
  };
  contextTruncation?: {
    enabled: boolean;
    maxRounds: number;
    tokenEstimation?: {
      chineseChar: number;
      englishChar: number;
      digitChar: number;
      jsonStructChar: number;
    };
  };
  contentFilter?: {
    enabled: boolean;
    categories: { privacy: boolean };
    replacements: { privacy: string };
  };
  timeout?: { upstream: number };
  dashboard?: { refreshInterval: number };
  tokenEstimation?: {
    chineseChar: number;
    englishChar: number;
    digitChar: number;
    jsonStructChar: number;
  };
  fullTrace?: {
    enabled: boolean;
    traceDir: string;
    maxFileSize: number;
  };
}

// ==================== Load Configuration ====================

function loadUserConfig(): Partial<SavorConfig> {
  const configPath = path.join(process.cwd(), 'config.js');
  
  if (fs.existsSync(configPath)) {
    try {
      delete require.cache[require.resolve(configPath)];
      const userConfig = require(configPath);
      logger.info('[Config] Loaded config.js');
      return userConfig;
    } catch (e) {
      logger.warn('[Config] Failed to load config.js, using defaults');
    }
  }
  
  return {};
}

function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

export const Config: SavorConfig = deepMerge(defaultConfig, loadUserConfig());

export function loadConfig(): SavorConfig {
  return Config;
}