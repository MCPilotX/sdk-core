# IntentOrch - Intent-Driven MCP Orchestration Toolkit

<div align="right">
  <small>
    <strong>Language:</strong>
    <a href="README.md">English</a> |
    <a href="docs/README.ZH_CN.md">中文</a>
  </small>
</div>

[![npm version](https://img.shields.io/npm/v/@mcpilotx/intentorch.svg)](https://www.npmjs.com/package/@mcpilotx/intentorch)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933.svg)](https://nodejs.org/)
[![Test Coverage](https://img.shields.io/badge/coverage-14.57%25-yellow.svg)](https://github.com/MCPilotX/IntentOrch)

**Transform natural language into executable workflows with AI-powered intent parsing and MCP tool orchestration.**

IntentOrch is a developer-first toolkit that bridges human intent with MCP (Model Context Protocol) capabilities. It understands what you want to accomplish, breaks it down into actionable steps, and orchestrates the right tools to get it done.

## 🎯 What Problem Does IntentOrch Solve?

Building AI applications that can actually *do things* is hard. You need to:
- Parse natural language instructions
- Map intents to available tools
- Handle dependencies between steps
- Execute workflows reliably
- Provide meaningful feedback

IntentOrch handles all of this complexity so you can focus on building amazing applications.

## ✨ Core Features

### 🤖 **Intent-Driven Workflows**
```typescript
// Tell IntentOrch what you want to accomplish
const result = await sdk.executeWorkflowWithTracking(
  "Analyze the README.md file and suggest improvements"
);
// IntentOrch will: parse the intent, select tools, execute steps, return results
```

### 🔧 **MCP Tool Orchestration**
- Connect to any MCP-compatible server
- Automatic tool discovery and registration
- Intelligent tool selection based on intent
- Parallel and sequential execution planning

### 🧠 **Cloud Intent Engine**
- LLM-powered intent parsing and decomposition
- Dependency graph generation (DAG)
- Parameter mapping from intent to tools
- Execution planning and optimization

### 🚀 **Runtime Intelligence**
- Automatic detection of project runtimes (Node.js, Python, Docker, Go, Rust)
- Runtime-specific adapter configuration
- Service lifecycle management

### 📡 **Advanced Transport Layer**
- Multiple transport types (stdio, HTTP, SSE)
- Intelligent log filtering
- Multi-line JSON support
- Error recovery and retry mechanisms

## 🚀 Quick Start

### Installation

```bash
npm install @mcpilotx/intentorch
# or
yarn add @mcpilotx/intentorch
# or
pnpm add @mcpilotx/intentorch
```

### Your First Intent-Driven Application

```typescript
import { createSDK } from '@mcpilotx/intentorch';

// Create SDK instance
const sdk = createSDK();

// Configure AI (supports DeepSeek, OpenAI, Ollama)
await sdk.configureAI({
  provider: 'deepseek',
  apiKey: process.env.DEEPSEEK_API_KEY,
  model: 'deepseek-chat'
});

// Connect to MCP servers
await sdk.connectMCPServer({
  name: 'filesystem',
  transport: {
    type: 'stdio',
    command: 'npx',
    args: ['@modelcontextprotocol/server-filesystem', '.']
  }
});

// Execute your first intent-driven workflow
const result = await sdk.executeWorkflowWithTracking(
  "Read the package.json file and tell me what dependencies it has"
);

console.log('Workflow completed!');
console.log('Answer:', result.result);
console.log('Tools used:', result.statistics?.successfulSteps || 0);
```

### Quick Test Script

Create `quick-test.js`:

```javascript
const { createSDK } = require('@mcpilotx/intentorch');

async function quickTest() {
  console.log('🚀 Testing IntentOrch...');
  
  const sdk = createSDK();
  console.log('✅ SDK created');
  
  // Initialize Cloud Intent Engine
  await sdk.initCloudIntentEngine();
  console.log('✅ Cloud Intent Engine initialized');
  
  // List available tools (even without MCP servers)
  const tools = sdk.listTools();
  console.log(`📦 ${tools.length} tools available`);
  
  console.log('🎉 IntentOrch is ready to transform your intents into actions!');
}

quickTest().catch(console.error);
```

Run it:
```bash
node quick-test.js
```

## 🏗️ Core Concepts

### 1. Intent Parsing
IntentOrch uses LLMs to understand natural language instructions and break them down into atomic intents:

```
"Analyze the project and create a summary"
↓
1. Read project files
2. Analyze code structure  
3. Generate summary report
```

### 2. Tool Selection
For each atomic intent, IntentOrch selects the most appropriate MCP tool:

```
Intent: "Read project files"
↓
Tool: filesystem/read_file
Parameters: { path: "package.json" }
```

### 3. Workflow Orchestration
IntentOrch creates and executes dependency-aware workflows:

```typescript
const workflow = await sdk.parseAndPlanWorkflow(
  "Clone a repo, analyze the code, and generate documentation"
);
// Returns: { plan: { query: "...", parsedIntents: [...], dependencies: [...], estimatedSteps: 3 } }
```

### 4. Execution with Tracking
Monitor each step of the workflow execution:

```typescript
const result = await sdk.executeWorkflowWithTracking(
  "Process user data and generate report",
  {
    onStepStarted: (step) => console.log(`Starting: ${step.intentDescription}`),
    onStepCompleted: (step) => console.log(`Completed in ${step.duration}ms`),
    onStepFailed: (error, step) => console.log(`Failed: ${step.toolName}`)
  }
);
```

## 📚 Comprehensive Examples

### Example 1: File Analysis Workflow

```typescript
import { createSDK } from '@mcpilotx/intentorch';

async function analyzeProject() {
  const sdk = createSDK();
  
  // Configure AI and MCP
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
  
  // Execute intent-driven analysis
  const result = await sdk.executeWorkflowWithTracking(`
    Analyze this TypeScript project:
    1. Read all .ts files in src/
    2. Identify the main architecture patterns
    3. Suggest improvements for error handling
    4. Generate a brief architecture summary
  `);
  
  return result;
}
```

### Example 2: Multi-Server Orchestration

```typescript
import { createSDK } from '@mcpilotx/intentorch';

async function multiServerWorkflow() {
  const sdk = createSDK();
  
  // Connect to multiple MCP servers
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
  
  // Complex intent that uses multiple servers
  const result = await sdk.executeWorkflowWithTracking(`
    Analyze the git history of this project:
    1. Get recent commits
    2. Check which files changed most frequently
    3. Read those files to understand the changes
    4. Suggest areas that need better testing
  `);
  
  return result;
}
```

### Example 3: Custom Tool Integration

```typescript
import { createSDK, ToolRegistry } from '@mcpilotx/intentorch';

async function customToolWorkflow() {
  const sdk = createSDK();
  
  // Register custom tools
  sdk.toolRegistry.registerTool({
    name: 'calculate_metrics',
    description: 'Calculate code quality metrics',
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
    // Your custom metric calculation logic
    return { 
      complexity: 8.5, 
      coverage: 0.85, 
      duplication: 0.12 
    };
  });
  
  // Use custom tools in intent execution
  const result = await sdk.executeWorkflowWithTracking(
    "Calculate code metrics for src/sdk.ts and suggest refactoring"
  );
  
  return result;
}
```

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Application                          │
├─────────────────────────────────────────────────────────────┤
│                   IntentOrch SDK                            │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Intent    │  │   Tool       │  │    Runtime       │  │
│  │   Engine    │  │   Registry   │  │    Adapters      │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                   MCP Transport Layer                       │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │    Stdio    │  │     HTTP     │  │      SSE         │  │
│  │  Transport  │  │  Transport   │  │   Transport      │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                  MCP Servers (Local/Remote)                │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Filesystem  │  │      Git     │  │    Database      │  │
│  │   Server    │  │    Server    │  │     Server       │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

1. **Cloud Intent Engine** - LLM-powered intent parsing and workflow planning
2. **Tool Registry** - Unified management of all MCP and custom tools
3. **Runtime Adapters** - Support for Node.js, Python, Docker, Go, Rust
4. **Transport Layer** - Communication with MCP servers (stdio/HTTP/SSE)
5. **Service Manager** - Lifecycle management of orchestrated services

## 🔧 Advanced Configuration

### Cloud Intent Engine Configuration

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

### Transport Configuration with Log Filtering

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

### Performance Monitoring

```typescript
import { getPerformanceMonitor } from '@mcpilotx/intentorch';

const monitor = getPerformanceMonitor();

// Monitor workflow execution
monitor.on('workflow_start', (data) => {
  console.log(`Workflow started: ${data.query}`);
});

monitor.on('workflow_complete', (data) => {
  console.log(`Workflow completed in ${data.duration}ms`);
});

// Get performance report
setInterval(async () => {
  const report = await monitor.getReport();
  console.log('Performance Report:', report);
}, 60000);
```

## 🧪 Testing & Development

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test suite
npm test -- tests/integration.test.ts
```

### Building from Source

```bash
# Clone repository
git clone https://github.com/MCPilotX/IntentOrch.git
cd IntentOrch

# Install dependencies
npm install

# Build the SDK
npm run build

# Run examples
npm run examples
```

### Core SDK Methods

| Method | Description | Example |
|--------|-------------|---------|
| `createSDK()` | Create SDK instance | `const sdk = createSDK()` |
| `sdk.executeWorkflowWithTracking()` | Execute intent-driven workflow with tracking | `await sdk.executeWorkflowWithTracking("Analyze project")` |
| `sdk.parseAndPlanWorkflow()` | Parse intent and create plan | `await sdk.parseAndPlanWorkflow("Complex task")` |
| `sdk.configureAI()` | Configure AI provider | `await sdk.configureAI(config)` |
| `sdk.connectMCPServer()` | Connect to MCP server | `await sdk.connectMCPServer(config)` |
| `sdk.initCloudIntentEngine()` | Initialize intent engine | `await sdk.initCloudIntentEngine()` |

### Tool Registry Methods

| Method | Description |
|--------|-------------|
| `sdk.toolRegistry.registerTool()` | Register custom tool |
| `sdk.listTools()` | List all available tools |
| `sdk.searchTools()` | Search tools by name/description |
| `sdk.executeTool()` | Execute specific tool |

### Runtime Detection

```typescript
import { EnhancedRuntimeDetector } from '@mcpilotx/intentorch';

const detection = await EnhancedRuntimeDetector.detect('.');
console.log('Runtime:', detection.runtime); // 'node', 'python', 'docker', etc.
console.log('Confidence:', detection.confidence);
```

## 🎯 Use Cases

### 1. **AI-Powered Development Tools**
Build VS Code extensions, CLI tools, or IDEs that understand developer intent and execute complex tasks autonomously.

### 2. **Automated Workflow Orchestration**
Create intelligent automation that can read files, call APIs, make decisions, and generate reports.

### 3. **Intelligent Chat Applications**
Build chatbots with access to tools and external data sources that can actually *do things*.

### 4. **DevOps Automation**
Automate infrastructure management, deployment, and monitoring with AI-driven decision making.

### 5. **Educational Tools**
Create interactive learning environments with AI tutors that can demonstrate concepts through action.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](docs/development.md) for details.

### Quick Contribution Steps:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## 📄 License

Apache 2.0 - See [LICENSE](LICENSE) for details.

## 🆘 Support

- **Documentation**: See [docs/](docs/) for detailed guides
- **Issues**: [GitHub Issues](https://github.com/MCPilotX/IntentOrch/issues)
- **Examples**: Check [examples/](examples/) directory
- **Community**: Join our Discord/Slack (link in GitHub)

## 🚀 Ready to Build?

Start transforming natural language into executable workflows today!

```typescript
import { createSDK } from '@mcpilotx/intentorch';

const sdk = createSDK();
const future = await sdk.executeWorkflowWithTracking(
  "What amazing things can I build with IntentOrch?"
);
console.log(future.result);
```

---

**Built with ❤️ by the MCPilot Team**

*IntentOrch: Where intent meets execution.*
