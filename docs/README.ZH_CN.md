# IntentOrch - 意图驱动的MCP编排工具包

<div align="right">
  <small>
    <strong>语言:</strong>
    <a href="../README.md">English</a> |
    <a href="README.ZH_CN.md">中文</a>
  </small>
</div>

[![npm version](https://img.shields.io/npm/v/@mcpilotx/intentorch.svg)](https://www.npmjs.com/package/@mcpilotx/intentorch)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933.svg)](https://nodejs.org/)
[![Test Coverage](https://img.shields.io/badge/coverage-14.57%25-yellow.svg)](https://github.com/MCPilotX/IntentOrch)

**通过AI驱动的意图解析和MCP工具编排，将自然语言转化为可执行的工作流。**

IntentOrch 是一个面向开发者的工具包，它连接人类意图与MCP（模型上下文协议）能力。它能理解您想要完成的任务，将其分解为可执行的步骤，并编排合适的工具来实现目标。

## 🎯 IntentOrch 解决什么问题？

构建真正能够*执行任务*的AI应用很困难。您需要：
- 解析自然语言指令
- 将意图映射到可用工具
- 处理步骤间的依赖关系
- 可靠地执行工作流
- 提供有意义的反馈

IntentOrch 处理所有这些复杂性，让您可以专注于构建出色的应用程序。

## ✨ 核心功能

### 🤖 **意图驱动的工作流**
```typescript
// 告诉IntentOrch您想要完成什么
const result = await sdk.executeWorkflowWithTracking(
  "分析README.md文件并提出改进建议"
);
// IntentOrch将：解析意图、选择工具、执行步骤、返回结果
```

### 🔧 **MCP工具编排**
- 连接到任何MCP兼容的服务器
- 自动工具发现和注册
- 基于意图的智能工具选择
- 并行和顺序执行规划

### 🧠 **云端意图引擎**
- LLM驱动的意图解析和分解
- 依赖图生成（DAG）
- 从意图到工具的参数映射
- 执行规划和优化

### 🚀 **运行时智能**
- 自动检测项目运行时（Node.js、Python、Docker、Go、Rust）
- 运行时特定的适配器配置
- 服务生命周期管理

### 📡 **高级传输层**
- 多种传输类型（stdio、HTTP、SSE）
- 智能日志过滤
- 多行JSON支持
- 错误恢复和重试机制

## 🚀 快速开始

### 安装

```bash
npm install @mcpilotx/intentorch
# 或
yarn add @mcpilotx/intentorch
# 或
pnpm add @mcpilotx/intentorch
```

### 您的第一个意图驱动应用

```typescript
import { createSDK } from '@mcpilotx/intentorch';

// 创建SDK实例
const sdk = createSDK();

// 配置AI（支持DeepSeek、OpenAI、Ollama）
await sdk.configureAI({
  provider: 'deepseek',
  apiKey: process.env.DEEPSEEK_API_KEY,
  model: 'deepseek-chat'
});

// 连接到MCP服务器
await sdk.connectMCPServer({
  name: 'filesystem',
  transport: {
    type: 'stdio',
    command: 'npx',
    args: ['@modelcontextprotocol/server-filesystem', '.']
  }
});

// 执行您的第一个意图驱动工作流
const result = await sdk.executeWorkflowWithTracking(
  "读取package.json文件并告诉我它有哪些依赖"
);

console.log('工作流完成！');
console.log('回答:', result.result);
console.log('使用的工具:', result.statistics?.successfulSteps || 0);
```

### 快速测试脚本

创建 `quick-test.js`：

```javascript
const { createSDK } = require('@mcpilotx/intentorch');

async function quickTest() {
  console.log('🚀 测试IntentOrch...');
  
  const sdk = createSDK();
  console.log('✅ SDK创建成功');
  
  // 初始化云端意图引擎
  await sdk.initCloudIntentEngine();
  console.log('✅ 云端意图引擎初始化成功');
  
  // 列出可用工具（即使没有MCP服务器）
  const tools = sdk.listTools();
  console.log(`📦 ${tools.length} 个工具可用`);
  
  console.log('🎉 IntentOrch已准备好将您的意图转化为行动！');
}

quickTest().catch(console.error);
```

运行：
```bash
node quick-test.js
```

## 🏗️ 核心概念

### 1. 意图解析
IntentOrch使用LLM理解自然语言指令并将其分解为原子意图：

```
"分析项目并创建摘要"
↓
1. 读取项目文件
2. 分析代码结构
3. 生成摘要报告
```

### 2. 工具选择
对于每个原子意图，IntentOrch选择最合适的MCP工具：

```
意图："读取项目文件"
↓
工具：filesystem/read_file
参数：{ path: "package.json" }
```

### 3. 工作流编排
IntentOrch创建并执行依赖感知的工作流：

```typescript
const workflow = await sdk.parseAndPlanWorkflow(
  "克隆仓库、分析代码并生成文档"
);
// 返回：{ plan: { query: "...", parsedIntents: [...], dependencies: [...], estimatedSteps: 3 } }
```

### 4. 带跟踪的执行
监控工作流执行的每个步骤：

```typescript
const result = await sdk.executeWorkflowWithTracking(
  "处理用户数据并生成报告",
  {
    onStepStarted: (step) => console.log(`开始：${step.intentDescription}`),
    onStepCompleted: (step) => console.log(`完成，耗时 ${step.duration}ms`),
    onStepFailed: (error, step) => console.log(`失败：${step.toolName}`)
  }
);
```

## 📚 综合示例

### 示例1：文件分析工作流

```typescript
import { createSDK } from '@mcpilotx/intentorch';

async function analyzeProject() {
  const sdk = createSDK();
  
  // 配置AI和MCP
  await sdk.configureAI({
    provider: 'deepseek',
    apiKey: process.env.DEEPSEEK_API_KEY
  });
  
  await sdk.connectMCPServer({
    name: 'filesystem',
    transport: {
      type: 'stdio',
      command: 'npx',
      args: ['@modelcontextprotocol/server-filesystem', '.']
    }
  });
  
  // 执行意图驱动分析
  const result = await sdk.executeWorkflowWithTracking(`
    分析这个TypeScript项目：
    1. 读取src/目录中的所有.ts文件
    2. 识别主要的架构模式
    3. 提出错误处理的改进建议
    4. 生成简要的架构摘要
  `);
  
  return result;
}
```

### 示例2：多服务器编排

```typescript
import { createSDK } from '@mcpilotx/intentorch';

async function multiServerWorkflow() {
  const sdk = createSDK();
  
  // 连接到多个MCP服务器
  await sdk.connectAllFromConfig({
    servers: [
      {
        name: 'filesystem',
        transport: {
          type: 'stdio',
          command: 'npx',
          args: ['@modelcontextprotocol/server-filesystem', '.']
        }
      },
      {
        name: 'git',
        transport: {
          type: 'stdio', 
          command: 'npx',
          args: ['@modelcontextprotocol/server-git', '.']
        }
      }
    ]
  });
  
  // 使用多个服务器的复杂意图
  const result = await sdk.executeWorkflowWithTracking(`
    分析这个项目的git历史：
    1. 获取最近的提交
    2. 检查哪些文件更改最频繁
    3. 读取这些文件以了解更改内容
    4. 建议需要更好测试的区域
  `);
  
  return result;
}
```

### 示例3：自定义工具集成

```typescript
import { createSDK, ToolRegistry } from '@mcpilotx/intentorch';

async function customToolWorkflow() {
  const sdk = createSDK();
  
  // 注册自定义工具
  sdk.toolRegistry.registerTool({
    name: 'calculate_metrics',
    description: '计算代码质量指标',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: { type: 'string' },
        metrics: { 
          type: 'array',
          items: { type: 'string', enum: ['complexity', 'coverage', 'duplication'] }
        }
      },
      required: ['filePath']
    }
  }, async (args) => {
    // 您的自定义指标计算逻辑
    return { 
      complexity: 8.5, 
      coverage: 0.85, 
      duplication: 0.12 
    };
  });
  
  // 在意图执行中使用自定义工具
  const result = await sdk.executeWorkflowWithTracking(
    "计算src/sdk.ts的代码指标并提出重构建议"
  );
  
  return result;
}
```

## 🏗️ 架构概述

```
┌─────────────────────────────────────────────────────────────┐
│                    您的应用程序                              │
├─────────────────────────────────────────────────────────────┤
│                   IntentOrch SDK                            │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   意图      │  │   工具       │  │    运行时        │  │
│  │   引擎      │  │   注册表     │  │    适配器        │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                   MCP传输层                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Stdio     │  │     HTTP     │  │      SSE         │  │
│  │   传输      │  │    传输      │  │     传输         │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                  MCP服务器（本地/远程）                    │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  文件系统   │  │     Git      │  │     数据库       │  │
│  │   服务器    │  │    服务器    │  │     服务器       │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 关键组件

1. **云端意图引擎** - LLM驱动的意图解析和工作流规划
2. **工具注册表** - 统一管理所有MCP和自定义工具
3. **运行时适配器** - 支持Node.js、Python、Docker、Go、Rust
4. **传输层** - 与MCP服务器的通信（stdio/HTTP/SSE）
5. **服务管理器** - 编排服务的生命周期管理

## 🔧 高级配置

### 云端意图引擎配置

```typescript
await sdk.initCloudIntentEngine({
  llm: {
    provider: 'deepseek',
    model: 'deepseek-chat',
    temperature: 0.7,
    maxTokens: 2000
  },
  planning: {
    maxParallelSteps: 3,
    timeoutPerStep: 30000,
    retryAttempts: 2
  }
});
```

### 带日志过滤的传输配置

```typescript
const sdk = createSDK({
  mcp: {
    servers: [{
      name: 'filesystem',
      transport: {
        type: 'stdio',
        command: 'npx',
        args: ['@modelcontextprotocol/server-filesystem'],
        logFilter: {
          ignorePatterns: ['^DEBUG:', '^TRACE:'],
          keepPatterns: ['^ERROR:', '^FATAL:'],
          timeout: 2000
        }
      }
    }]
  }
});
```

### 性能监控

```typescript
import { getPerformanceMonitor } from '@mcpilotx/intentorch';

const monitor = getPerformanceMonitor();

// 监控工作流执行
monitor.on('workflow_start', (data) => {
  console.log(`工作流开始：${data.query}`);
});

monitor.on('workflow_complete', (data) => {
  console.log(`工作流完成，耗时 ${data.duration}ms`);
});

// 获取性能报告
setInterval(async () => {
  const report = await monitor.getReport();
  console.log('性能报告：', report);
}, 60000);
```

## 🧪 测试与开发

### 运行测试

```bash
# 运行所有测试
npm test

# 运行带覆盖率的测试
npm test -- --coverage

# 运行特定测试套件
npm test -- tests/integration.test.ts
```

### 从源代码构建

```bash
# 克隆仓库
git clone https://github.com/MCPilotX/IntentOrch.git
cd IntentOrch

# 安装依赖
npm install

# 构建SDK
npm run build

# 运行示例
npm run examples
```


## 📖 API参考

### 核心SDK方法

| 方法 | 描述 | 示例 |
|------|------|------|
| `createSDK()` | 创建SDK实例 | `const sdk = createSDK()` |
| `sdk.executeWorkflowWithTracking()` | 执行意图驱动的工作流（带跟踪） | `await sdk.executeWorkflowWithTracking("分析项目")` |
| `sdk.parseAndPlanWorkflow()` | 解析意图并创建计划 | `await sdk.parseAndPlanWorkflow("复杂任务")` |
| `sdk.configureAI()` | 配置AI提供商 | `await sdk.configureAI(config)` |
| `sdk.connectMCPServer()` | 连接到MCP服务器 | `await sdk.connectMCPServer(config)` |
| `sdk.initCloudIntentEngine()` | 初始化意图引擎 | `await sdk.initCloudIntentEngine()` |

### 工具注册表方法

| 方法 | 描述 |
|------|------|
| `sdk.toolRegistry.registerTool()` | 注册自定义工具 |
| `sdk.listTools()` | 列出所有可用工具 |
| `sdk.searchTools()` | 按名称/描述搜索工具 |
| `sdk.executeTool()` | 执行特定工具 |

### 运行时检测

```typescript
import { EnhancedRuntimeDetector } from '@mcpilotx/intentorch';

const detection = await EnhancedRuntimeDetector.detect('.');
console.log('运行时:', detection.runtime); // 'node', 'python', 'docker' 等
console.log('置信度:', detection.confidence);
```

## 🎯 使用案例

### 1. **AI驱动的开发工具**
构建VS Code扩展、CLI工具或IDE，使其能够理解开发者意图并自主执行复杂任务。

### 2. **自动化工作流编排**
创建能够读取文件、调用API、做出决策并生成报告的智能自动化。

### 3. **智能聊天应用**
构建能够访问工具和外部数据源并真正*执行任务*的聊天机器人。

### 4. **DevOps自动化**
通过AI驱动的决策自动化基础设施管理、部署和监控。

### 5. **教育工具**
创建具有AI导师的交互式学习环境，能够通过行动演示概念。

## 🤝 贡献

我们欢迎贡献！请参阅 [贡献指南](development.md) 了解详情。

### 快速贡献步骤：
1. Fork仓库
2. 创建功能分支
3. 进行更改
4. 运行测试：`npm test`
5. 提交拉取请求

## 📄 许可证

Apache 2.0 - 查看 [LICENSE](../LICENSE) 了解详情。

## 🆘 支持

- **文档**：查看 [docs/](.) 获取详细指南
- **问题**：[GitHub Issues](https://github.com/MCPilotX/IntentOrch/issues)
- **示例**：查看 [examples/](../examples/) 目录
- **社区**：加入我们的Discord/Slack（GitHub中的链接）

## 🚀 准备构建？

立即开始将自然语言转化为可执行的工作流！

```typescript
import { createSDK } from '@mcpilotx/intentorch';

const sdk = createSDK();
const future = await sdk.executeWorkflowWithTracking(
  "我能用IntentOrch构建什么令人惊叹的东西？"
);
console.log(future.result);
```

---

**由IntentOrch团队用 ❤️ 构建**

*IntentOrch：意图与执行的交汇点。*
