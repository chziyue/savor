/**
 * Savor Configuration / Savor 配置文件
 * Modify values below to adjust proxy behavior / 修改这里的值来调整代理行为
 */

module.exports = {
  // ==================== Common Configuration / 常用配置 ====================
  
  // Upstream LLM API URL / 上游大模型 API 地址
  // Example: 'https://api.example.com/v1' / 示例
  upstream: 'https://api.example.com/v1',
  
  // Server port / 服务监听端口
  port: 3456,
  
  // Listen address / 监听地址
  // '0.0.0.0' = Allow external access / 允许外部访问
  // '127.0.0.1' = Local only / 仅本机访问
  host: '0.0.0.0',
  
  // Model override / 模型替换
  // Ignores OpenClaw's model config / 无视 OpenClaw 的模型配置
  modelOverride: {
    enabled: false,    // true = Replace with model below / true = 替换为下面的模型
    model: ''          // Model name / 模型名称，如 'glm-5'
  },
  
  // API Key override / API Key 替换
  // Ignores OpenClaw's API Key config / 无视 OpenClaw 的 API Key 配置
  // Protects real API Key from network exposure / 保护真实 Key 不在网络上传输
  apiKeyOverride: {
    enabled: false,    // true = Replace with API Key below / true = 替换为下面的 API Key
    apiKey: ''         // API Key
  },
  
  // CORS whitelist / CORS 跨域白名单
  cors: {
    allowedOrigins: [
      'http://localhost:3456',
      'http://127.0.0.1:3456',
      'https://localhost:3457',
      'https://127.0.0.1:3457'
    ]
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
    rateLimit: true,     // Rate limiting / 限流控制（防止 API 滥用）
    webDashboard: true,  // Web dashboard / Web 看板
    loopGuard: true      // Loop protection / 循环保护（打断工具无限循环）
  },
  
  // Context truncation / 上下文截断
  // Saves tokens by keeping only recent N rounds / 只保留最近 N 轮对话，节省 Token
  contextTruncation: {
    enabled: false,    // Enable / 开关
    maxRounds: 20      // Keep last N rounds / 保留最近 N 轮对话
  },
  
  // Content filter / 内容过滤
  contentFilter: {
    enabled: true,     // Enable / 总开关
    privacy: true      // Filter sensitive info / 过滤隐私信息（电话、身份证、邮箱等）
  }
};