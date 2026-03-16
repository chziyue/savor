#!/usr/bin/env node
/**
 * Savor 启动脚本
 */

const { spawn } = require('child_process');
const path = require('path');

// 获取配置名称参数
const configName = process.argv[2] || process.env.CONFIG || 'default';

console.log(`[Savor] 使用配置: ${configName}`);

// 设置环境变量
process.env.CONFIG = configName;

// 启动服务
const tsxPath = path.join(__dirname, '..', 'node_modules', '.bin', 'tsx');
const indexPath = path.join(__dirname, '..', 'src', 'index.ts');

const child = spawn(tsxPath, [indexPath], {
  stdio: 'inherit',
  env: process.env
});

child.on('close', (code) => {
  process.exit(code);
});