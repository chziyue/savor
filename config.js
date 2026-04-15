/**
 * Savor Configuration / Savor 配置文件
 * Modify values below to adjust proxy behavior / 修改这里的值来调整代理行为
 */

module.exports = {
  // ==================== Common Configuration / 常用配置 ====================

  // Upstream LLM API URL / 上游大模型 API 地址
  // Example: 'https://api.example.com/v1' / 示例
  upstream: 'https://api.example.com/v1',
  upstreamAppendV1: false,  // true = 自动追加 /v1，false = 不追加

  // Anthropic API URL / Anthropic API 地址
  // For Anthropic protocol requests / 用于 Anthropic 协议请求
  // 阿里云百炼官方格式不带 /v1，如：https://coding.dashscope.aliyuncs.com/apps/anthropic
  anthropicUpstream: 'https://api.example.com',
  anthropicUpstreamAppendV1: false,  // true = 自动追加 /v1，false = 不追加

  // Server port / 服务监听端口
  port: 3456,
  
  // Listen address / 监听地址
  // '0.0.0.0' = Allow external access / 允许外部访问
  // '127.0.0.1' = Local only / 仅本机访问
  host: '0.0.0.0',
  
  // Model override / 模型替换
  // Ignores client's model config / 用于 OpenAi 协议请求
  modelOverride: {
    enabled: false,    // true = Replace with model below / true = 替换为下面的模型
    model: ''          // Model name / 模型名称，如 'glm-4'
  },

  // Anthropic Model override / Anthropic 模型替换
  // For Anthropic protocol requests / 用于 Anthropic 协议请求
  anthropicModelOverride: {
    enabled: false,    // true = Replace with model below / true = 替换为下面的模型
    model: ''          // Model name / 模型名称，如 'claude-3-sonnet-20240229'
  },
  
  // API Key override / API Key 替换
  // Ignores client's API Key config / OpenAI API Key 替换
  // Protects real API Key from network exposure / 保护真实 Key 不在网络上传输
  apiKeyOverride: {
    enabled: false,    // true = Replace with API Key below / true = 替换为下面的 API Key
    apiKey: ''         // API Key
  },

  // Anthropic API Key override / Anthropic API Key 替换
  // For Anthropic protocol requests / 用于 Anthropic 协议请求
  anthropicApiKeyOverride: {
    enabled: false,    // true = Replace with API Key below / true = 替换为下面的 API Key
    apiKey: ''         // Anthropic API Key
  },
  
  // CORS whitelist / CORS 跨域白名单
  cors: {
    allowedOrigins: [
      'http://localhost:3456',
      'http://127.0.0.1:3456',
      'https://localhost:3457',
      'https://127.0.0.1:3457'
    ],
    credentials: true,
    maxAge: 86400
  },
  
  // HTTPS configuration / HTTPS 配置
  https: {
    enabled: false,                // Enable HTTPS / 开关
    port: 3457,                    // HTTPS port / HTTPS 端口
    keyPath: './certs/key.pem',    // Private key path / 私钥路径
    certPath: './certs/cert.pem'   // Certificate path / 证书路径
  },
  
  // ==================== Advanced Configuration / 高级配置 ====================
  
  // Feature toggles / 功能开关
  features: {
    stats: true,         // Request statistics / 统计记录（Web 看板数据来源）
    webDashboard: true   // Web dashboard / Web 看板
  },
  
  // Context truncation / 上下文截断
  // Saves tokens by keeping only recent N rounds / 只保留最近 N 轮对话，节省 Token
  contextTruncation: {
    enabled: false,    // Enable / 开关
    maxRounds: 20      // Keep last N rounds / 保留最近 N 轮对话
  },
  
  // Content filter / 内容过滤
  contentFilter: {
    enabled: true,                          // Enable / 总开关
    categories: { privacy: true },          // Filter categories / 过滤类别
    replacements: { privacy: '<privacy-filtered>' }  // Replacement text / 替换文本
  },
  
  // Loop guard / 循环保护
  loopGuard: {
    enabled: true,       // Enable / 开关
    stopAfter: 3,        // Break loop after N requests / 第 N 次熔断
    countWindow: 60000   // Count window (ms) / 计数窗口（毫秒）
  },
  
  // Rate limit / 限流
  rateLimit: {
    enabled: true,           // Enable / 开关
    requestsPerMinute: 30,  // Max requests per minute / 每分钟最大请求数
    windowMs: 60000,         // Time window (ms) / 时间窗口（毫秒）
    permanentLock: 60        // Lock duration (minutes), false = no lock / 锁定时长（分钟）
  },
  
  // Logging / 日志
  logLevel: 'info',    // Log level: debug, info, warn, error / 日志级别
  logDir: './logs',    // Log directory / 日志目录
  
  // Timeout / 超时
  timeout: {
    upstream: 300000   // Upstream API timeout (ms) / 上游 API 超时（毫秒）
  },
  
  // Dashboard / 看板
  dashboard: {
    refreshInterval: 5000,   // Auto refresh interval (ms) / 自动刷新间隔（毫秒）
    theme: 'glass'           // Theme: 'glass' | 'cyber' / 主题：玻璃 | 赛博朋克
  },
  
  // Token estimation / Token 估算系数
  tokenEstimation: {
    chineseChar: 1.0,    // Chinese character coefficient / 中文字符系数
    englishChar: 0.5,   // English character coefficient / 英文字符系数
    digitChar: 0.6,     // Digit coefficient / 数字系数
    jsonStructChar: 0.7  // JSON structure character coefficient / JSON 结构字符系数
  },
  
  // Full trace / 全链路追踪
  fullTrace: {
    enabled: false,              // Enable / 开关
    traceDir: './traces',        // Trace directory / 追踪目录
    maxFileSize: 104857600       // Max file size (100MB) / 最大文件大小
  },
  
  // Commands / 命令功能
  // 特殊命令触发特定行为
  commands: {
    enabled: true,    // Enable / 开关
    prefix: '\\'      // Command prefix / 命令前缀（\翻译 触发截断上下文）
  }
};
