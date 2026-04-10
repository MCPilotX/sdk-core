# GitHub PR 分析 + 钉钉通知 AI 工作流

使用 IntentOrch 构建的自动分析 GitHub PR 并发送钉钉通知的 AI 工作流。

## 功能特性

- 🤖 **AI 驱动的 PR 分析**: 使用 AI 自动分析 GitHub PR 内容
- 📊 **智能报告生成**: 生成包含 PR 详情、文件变更、风险评估和评审建议的详细报告
- 📨 **钉钉通知集成**: 自动将分析报告发送到钉钉群聊
- 🔄 **意图编排**: 使用 IntentOrch 的自然语言意图解析和工具编排
- 📈 **执行跟踪**: 实时跟踪工作流执行状态和性能统计

## 快速开始

### 1. 安装依赖

```bash
# 安装 IntentOrch
npm install @mcpilotx/intentorch

# 安装必要的 MCP 服务器
npm install -g @modelcontextprotocol/server-github
npm install -g dingtalk-mcp
```

### 2. 配置环境变量
编辑 `.env` 文件，填写以下信息：

```env
# GitHub 配置
GITHUB_TOKEN=你的GitHub个人访问令牌

# 钉钉配置
DINGTALK_APP_KEY=你的钉钉应用AppKey
DINGTALK_APP_SECRET=你的钉钉应用AppSecret
DINGTALK_ROBOT_CODE=你的钉钉机器人Code
DINGTALK_CHAT_ID=钉钉群聊ID

# AI 服务配置
AI_API_KEY=你的AI服务API密钥
AI_PROVIDER=deepseek  # 可选: deepseek, openai, ollama
AI_MODEL=deepseek-chat  # 可选: deepseek-chat, gpt-4, gpt-3.5-turbo等

# GitHub 仓库配置
REPO_OWNER=MCPilotX  # 仓库所有者
REPO_NAME=IntentOrch  # 仓库名称
PR_NUMBER=1  # PR编号
```

### 3. 获取必要的 API 密钥

#### GitHub 个人访问令牌
1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token"
3. 选择适当的权限（至少需要 `repo` 权限）

#### 钉钉应用配置
1. 登录钉钉开放平台：https://open.dingtalk.com/
2. 创建企业内部应用
3. 获取 AppKey 和 AppSecret
4. 启用机器人功能并获取机器人 Code
5. 获取要发送消息的群聊 ID

#### AI 服务 API 密钥
- **DeepSeek**: 访问 https://platform.deepseek.com/api_keys
- **OpenAI**: 访问 https://platform.openai.com/api-keys
- **Ollama**: 本地运行，无需 API 密钥

### 4. 运行工作流

```bash
# 确保项目已构建
npm run build

# 运行工作流
node github-pr-dingtalk.js
```

## 工作流详情

### 工作流步骤

1. **连接 MCP 服务器**
   - 连接 GitHub MCP 服务器
   - 连接钉钉 MCP 服务器

2. **初始化 AI 引擎**
   - 配置 AI 服务提供商
   - 初始化 Cloud Intent Engine

3. **解析自然语言意图**
   - 解析工作流描述
   - 分解为原子意图
   - 选择适当的工具

4. **执行工作流**
   - 获取 GitHub PR 详情
   - 获取 PR 文件变更
   - 使用 AI 分析 PR 内容
   - 生成分析报告
   - 发送报告到钉钉

### 生成的报告内容

- **PR 基本信息**: 标题、描述、作者、创建时间
- **文件变更统计**: 新增、修改、删除的文件数量
- **代码变更分析**: 主要变更的文件和内容
- **风险评估**: 潜在的风险和影响
- **评审建议**: 代码质量改进建议
- **自动化建议**: 可能的自动化改进点


### 常见问题

1. **MCP 服务器连接失败**
   - 检查 MCP 服务器是否已安装：`npm list -g | grep mcp`
   - 确保环境变量正确设置
   - 检查网络连接

2. **GitHub API 权限不足**
   - 确保 GitHub 令牌具有 `repo` 权限
   - 检查令牌是否已过期
   - 验证仓库访问权限

3. **钉钉消息发送失败**
   - 验证钉钉应用配置
   - 检查机器人是否已添加到群聊
   - 确认群聊 ID 正确

4. **AI 服务错误**
   - 检查 API 密钥是否正确
   - 验证 API 配额是否充足
   - 确认模型名称正确

### 调试模式

启用详细日志输出：

```javascript
const sdk = createSDK({
  logger: {
    info: (msg) => console.log(`[INFO] ${msg}`),
    error: (msg) => console.log(`[ERROR] ${msg}`),
    debug: (msg) => console.log(`[DEBUG] ${msg}`),
    warn: (msg) => console.log(`[WARN] ${msg}`),
    trace: (msg) => console.log(`[TRACE] ${msg}`)
  }
});
```

## 扩展功能

### 1. 添加更多分析维度

可以扩展工作流以包含：
- **代码复杂度分析**
- **依赖关系检查**
- **安全漏洞扫描**
- **性能基准测试**

### 2. 支持更多通知渠道

除了钉钉，还可以集成：
- **企业微信**
- **飞书**
- **Slack**
- **邮件通知**

### 3. 自定义分析模板

创建自定义的分析模板：

```javascript
const analysisTemplates = {
  'code-review': '专注于代码质量和最佳实践',
  'security-audit': '专注于安全漏洞和风险',
  'performance-review': '专注于性能影响和优化',
  'comprehensive': '全面的代码审查和分析'
};
```

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个工作流。

## 许可证

Apache 2.0

## 支持

如有问题，请：
1. 查看 [IntentOrch 文档](https://github.com/MCPilotX/IntentOrch)
2. 提交 [GitHub Issue](https://github.com/MCPilotX/IntentOrch/issues)
3. 参考示例代码和文档
