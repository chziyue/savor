/**
 * PM2 配置文件
 * 进程守护 + 自动重启
 */

module.exports = {
  apps: [
    {
      name: 'savor',
      script: './bin/start.js',
      instances: 1,
      exec_mode: 'fork',
      
      // 环境变量
      env: {
        NODE_ENV: 'production',
        CONFIG: 'ollama'
      },
      
      // 日志配置
      log_file: './logs/pm2-combined.log',
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // 自动重启
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      
      // 内存限制
      max_memory_restart: '500M',
      
      // 优雅关闭
      kill_timeout: 5000,
      listen_timeout: 10000,
      
      // 监控
      monitoring: true,
      
      // 启动延迟（等数据库初始化）
      post_delay: 2000
    }
  ]
};
