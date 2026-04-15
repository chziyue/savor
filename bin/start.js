#!/usr/bin/env node
/**
 * Savor 启动脚本
 */

const path = require('path');

// 获取配置名称参数
const configName = process.argv[2] || process.env.CONFIG || 'default';

console.log(`[Savor] 使用配置: ${configName}`);

// 设置环境变量
process.env.CONFIG = configName;

// 启动编译后的服务
require(path.join(__dirname, '..', 'dist', 'index.js'));