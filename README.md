# MCPilot SDK Core

<div align="right">
  <small>
    <strong>Language:</strong>
    <a href="README.md">English</a> |
    <a href="docs/README.ZH_CN.md">中文</a>
  </small>
</div>

[![npm version](https://img.shields.io/npm/v/@mcpilotx/sdk-core.svg)](https://www.npmjs.com/package/@mcpilotx/sdk-core)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933.svg)](https://nodejs.org/)

**The ultimate SDK for building AI-powered applications with MCP (Model Context Protocol) support.**

MCPilot SDK Core provides everything you need to integrate AI capabilities, MCP tool management, and intelligent runtime detection into your applications - with minimal configuration and maximum flexibility.

## 🚀 Quick Start

### Installation

```bash
npm install @mcpilotx/sdk-core
# or
yarn add @mcpilotx/sdk-core
# or
pnpm add @mcpilotx/sdk-core
```

### Basic Usage in 30 Seconds

```typescript
import { MCPilotSDK, createSDK } from '@mcpilotx/sdk-core';

// Option 1: Use the singleton
import { mcpilot } from '@mcpilotx/sdk-core';

// Option 2: Create your own instance
const sdk = new MCPilotSDK();
// or
const sdk = createSDK();

// Start using AI immediately
const response = await sdk.ask("What's the weather like today?");
console.log(response); // AI response based on context
```

## ✨ Core Features

### 🤖 **AI Integration Made Simple**
```typescript
// Configure AI with your preferred provider
await sdk.configureAI({
  provider: 'openai', // or 'anthropic', 'google', 'azure'
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4'
});

// Ask questions naturally
const answer = await sdk.ask("Explain quantum computing in simple terms");
```

### 🔧 **MCP Tool Management**
```typescript
// Connect to MCP servers
await sdk.connectMCPServer({
  transport: {
    type: 'stdio',
    command: 'npx',
    args: ['@modelcontextprotocol/server-filesystem']
  }
});

// Use tools automatically
const fileContent = await sdk.useTool('read_file', { path: 'README.md' });
```

### 🧠 **Intelligent Runtime Detection**
```typescript
// Auto-detect project type and setup
const detection = await sdk.detectRuntime();
console.log(detection.type); // 'node', 'python', 'docker', etc.
console.log(detection.tools); // Available tools for this runtime
```

### 📡 **Advanced Transport Layer**
```typescript
import { TransportFactory, StdioLogFilterConfig } from '@mcpilotx/sdk-core';

// Create transport with smart log filtering
const logFilter: StdioLogFilterConfig = {
  ignorePatterns: ['^DEBUG:', '^TRACE:'], // Hide debug logs
  keepPatterns: ['^ERROR:', '^FATAL:'],   // Always show errors
  timeout: 2000                           // Buffer timeout
};

const transport = TransportFactory.create({
  type: 'stdio',
  command: 'my-server',
  logFilter
});
```

## 📚 Comprehensive Examples

### Example 1: Full AI Application
```typescript
import { MCPilotSDK } from '@mcpilotx/sdk-core';

const sdk = new MCPilotSDK({
  ai: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY
  },
  mcp: {
    servers: [
      {
        name: 'filesystem',
        transport: {
          type: 'stdio',
          command: 'npx',
          args: ['@modelcontextprotocol/server-filesystem']
        }
      }
    ]
  }
});

// Ask AI to read and analyze a file
const analysis = await sdk.ask(
  "Read package.json and suggest improvements",
  { useTools: true }
);
```

### Example 2: Custom Tool Integration
```typescript
import { MCPilotSDK, ToolRegistry } from '@mcpilotx/sdk-core';

// Register custom tools
const registry = new ToolRegistry();
registry.registerTool({
  name: 'calculate',
  description: 'Perform mathematical calculations',
  inputSchema: {
    type: 'object',
    properties: {
      expression: { type: 'string' }
    },
    required: ['expression']
  },
  execute: async ({ expression }) => {
    return { result: eval(expression) };
  }
});

const sdk = new MCPilotSDK({ toolRegistry: registry });
```

### Example 3: Server Discovery & Auto-Connect
```typescript
import { 
  MCPilotSDK, 
  discoverLocalMCPServers,
  loadMCPServersFromEnv 
} from '@mcpilotx/sdk-core';

// Auto-discover local MCP servers
const servers = await discoverLocalMCPServers();
// Or load from environment variables
const envServers = loadMCPServersFromEnv();

const sdk = new MCPilotSDK({
  mcp: { servers: [...servers, ...envServers] }
});

// Auto-connect to all discovered servers
await sdk.connectAllMCPServers();
```

## 🛠️ Advanced Configuration

### Transport Configuration
```typescript
import { TransportConfig, StdioLogFilterConfig } from '@mcpilotx/sdk-core';

// Stdio transport with advanced filtering
const stdioConfig: TransportConfig = {
  type: 'stdio',
  command: 'python',
  args: ['my_script.py'],
  logFilter: {
    ignorePatterns: [
      '^DEBUG:.*',
      '^\\[\\d{4}-\\d{2}-\\d{2}.*INFO.*'
    ],
    keepPatterns: [
      '^ERROR:.*',
      '.*Exception.*',
      '.*failed.*'
    ],
    timeout: 1000,
    bufferSize: 4096,
    verbose: process.env.NODE_ENV === 'development'
  }
};

// HTTP transport
const httpConfig: TransportConfig = {
  type: 'http',
  url: 'http://localhost:8080/mcp',
  headers: {
    'Authorization': `Bearer ${process.env.MCP_TOKEN}`
  }
};

// SSE (Server-Sent Events) transport
const sseConfig: TransportConfig = {
  type: 'sse',
  url: 'http://localhost:8080/events'
};
```

### AI Provider Configuration
```typescript
import { AIConfig } from '@mcpilotx/sdk-core';

const aiConfig: AIConfig = {
  provider: 'openai', // 'anthropic', 'google', 'azure', 'none'
  apiKey: process.env.AI_API_KEY,
  model: 'gpt-4-turbo',
  temperature: 0.7,
  maxTokens: 2000,
  streaming: true, // Enable streaming responses
  tools: true,     // Enable tool usage
  cache: {
    enabled: true,
    ttl: 300000 // 5 minutes
  }
};
```

## 🔌 MCP Protocol Support

### Built-in MCP Constants
```typescript
import { MCP_METHODS, MCP_ERROR_CODES } from '@mcpilotx/sdk-core';

console.log(MCP_METHODS.TOOLS_LIST);      // "tools/list"
console.log(MCP_METHODS.TOOLS_CALL);      // "tools/call"
console.log(MCP_ERROR_CODES.PARSE_ERROR); // -32700
```

### Tool Categories & Patterns
```typescript
import { TOOL_CATEGORIES, TOOL_PATTERNS } from '@mcpilotx/sdk-core';

// Predefined categories
console.log(TOOL_CATEGORIES.FILESYSTEM); // "filesystem"
console.log(TOOL_CATEGORIES.AI);         // "ai"

// Predefined tool patterns
console.log(TOOL_PATTERNS.READ_FILE.name);    // "read_file"
console.log(TOOL_PATTERNS.WRITE_FILE.name);   // "write_file"
```

## 🧪 Testing & Development

### Run Tests
```bash
npm test
# Run specific test suite
npm test -- tests/transport-improvements.test.ts
```

### Build from Source
```bash
npm run build
```

### TypeScript Support
Full TypeScript definitions included. Get autocomplete and type checking in your IDE.

## 📖 API Reference

### Core Classes
- **`MCPilotSDK`** - Main SDK class
- **`SimpleAI`** - AI service wrapper
- **`MCPClient`** - MCP protocol client
- **`ToolRegistry`** - Tool management
- **`ConfigManager`** - Configuration management

### Transport Layer
- **`BaseTransport`** - Base transport class
- **`StdioTransport`** - STDIO transport
- **`HTTPTransport`** - HTTP transport  
- **`SSETransport`** - SSE transport
- **`TransportFactory`** - Transport creation

### Utility Functions
- **`createSDK()`** - Quick SDK creation
- **`createMCPConfig()`** - MCP config helper
- **`discoverLocalMCPServers()`** - Server discovery
- **`loadMCPServersFromEnv()`** - Environment loader

## 🎯 Use Cases

### 1. **AI-Powered Development Tools** 🛠️
Build VS Code extensions, CLI tools, or IDEs that understand code context and can perform complex development tasks autonomously.

### 2. **Automated Workflows**
Create intelligent automation that can read files, call APIs, and make decisions.

### 3. **Chat Applications**
Build chatbots with access to tools and external data sources.

### 4. **DevOps Automation**
Automate infrastructure management with AI-driven decisions.

### 5. **Educational Tools**
Create interactive learning environments with AI tutors.

## 🔧 Advanced Features

### Smart Log Filtering
```typescript
// Filter out noise, keep what matters
const transport = TransportFactory.create({
  type: 'stdio',
  command: 'noisy-server',
  logFilter: {
    // Hide timestamped INFO logs
    ignorePatterns: ['^\\[\\d{4}-\\d{2}-\\d{2}.*INFO.*'],
    // Always show errors and warnings
    keepPatterns: ['^ERROR:', '^WARN:', '^FATAL:'],
    // Buffer incomplete JSON for 2 seconds
    timeout: 2000
  }
});
```

### Multi-line JSON Support
Automatically handles JSON that spans multiple lines in output streams.

### Error Recovery
Built-in retry logic and error handling for network issues.

### Performance Monitoring
Track response times and optimize performance.

## 🚀 AI-Powered Development Tools - Deep Dive

MCPilot SDK Core is specifically designed for building next-generation AI-powered development tools. Here are comprehensive examples showing how to build intelligent development assistants:

### Example 1: Intelligent Code Review Assistant
```typescript
import { MCPilotSDK, ToolRegistry } from '@mcpilotx/sdk-core';

class CodeReviewAssistant {
  private sdk: MCPilotSDK;
  
  constructor() {
    const registry = new ToolRegistry();
    
    // Register development-specific tools
    registry.registerTool({
      name: 'analyze_code',
      description: 'Analyze code for issues and improvements',
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          language: { type: 'string' }
        },
        required: ['code']
      },
      execute: async ({ code, language }) => {
        // Use AI to analyze code
        const analysis = await this.sdk.ask(
          `Analyze this ${language} code for issues:\n${code}`,
          { useTools: false }
        );
        return { analysis };
      }
    });
    
    registry.registerTool({
      name: 'suggest_refactoring',
      description: 'Suggest code refactoring improvements',
      inputSchema: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          issue: { type: 'string' }
        },
        required: ['code', 'issue']
      },
      execute: async ({ code, issue }) => {
        const suggestion = await this.sdk.ask(
          `Suggest refactoring for this code to fix: ${issue}\nCode:\n${code}`,
          { useTools: false }
        );
        return { suggestion };
      }
    });
    
    this.sdk = new MCPilotSDK({
      ai: {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4'
      },
      toolRegistry: registry
    });
  }
  
  async reviewCode(filePath: string, language: string): Promise<string> {
    // Read file content (using MCP filesystem server)
    const fileContent = await this.sdk.useTool('read_file', { 
      path: filePath,
      encoding: 'utf-8'
    });
    
    // Analyze the code
    const analysis = await this.sdk.useTool('analyze_code', {
      code: fileContent.content,
      language
    });
    
    // Generate review report
    const report = await this.sdk.ask(
      `Generate a comprehensive code review report based on this analysis: ${analysis.analysis}`,
      { useTools: true }
    );
    
    return report;
  }
}

// Usage
const assistant = new CodeReviewAssistant();
const review = await assistant.reviewCode('src/app.ts', 'typescript');
console.log('Code Review:', review);
```

### Example 2: Smart CLI Development Tool
```typescript
import { MCPilotSDK, createSDK } from '@mcpilotx/sdk-core';
import { Command } from 'commander';

class DevCLI {
  private sdk: MCPilotSDK;
  private program: Command;
  
  constructor() {
    this.sdk = createSDK({
      ai: {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY
      },
      mcp: {
        servers: [
          {
            name: 'filesystem',
            transport: {
              type: 'stdio',
              command: 'npx',
              args: ['@modelcontextprotocol/server-filesystem']
            }
          },
          {
            name: 'git',
            transport: {
              type: 'stdio',
              command: 'npx',
              args: ['@modelcontextprotocol/server-git']
            }
          }
        ]
      }
    });
    
    this.program = new Command();
    this.setupCommands();
  }
  
  private setupCommands() {
    this.program
      .command('explain <file>')
      .description('Explain what a file does')
      .action(async (file) => {
        const explanation = await this.sdk.ask(
          `Explain what this file does: ${file}`,
          { useTools: true }
        );
        console.log(explanation);
      });
    
    this.program
      .command('debug <file>')
      .description('Help debug issues in a file')
      .action(async (file) => {
        const debugHelp = await this.sdk.ask(
          `Help me debug issues in: ${file}`,
          { useTools: true }
        );
        console.log(debugHelp);
      });
    
    this.program
      .command('generate <component>')
      .description('Generate code for a component')
      .option('-t, --type <type>', 'Component type', 'react')
      .action(async (component, options) => {
        const code = await this.sdk.ask(
          `Generate ${options.type} code for: ${component}`,
          { useTools: true }
        );
        console.log(code);
      });
  }
  
  async run() {
    await this.sdk.connectAllMCPServers();
    this.program.parse(process.argv);
  }
}

// Usage: node dev-cli.js explain src/components/Button.tsx
// Usage: node dev-cli.js generate user-profile --type=vue
```

### Example 3: VS Code Extension with AI Capabilities
```typescript
import * as vscode from 'vscode';
import { MCPilotSDK } from '@mcpilotx/sdk-core';

export function activate(context: vscode.ExtensionContext) {
  // Initialize SDK
  const sdk = new MCPilotSDK({
    ai: {
      provider: 'openai',
      apiKey: vscode.workspace.getConfiguration().get('mcpilot.openaiKey')
    }
  });
  
  // Register "Explain Code" command
  const explainCommand = vscode.commands.registerCommand(
    'mcpilot.explainCode',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      
      const selection = editor.selection;
      const text = editor.document.getText(selection);
      
      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Analyzing code...',
        cancellable: false
      }, async (progress) => {
        const explanation = await sdk.ask(
          `Explain this code:\n${text}`,
          { useTools: true }
        );
        
        // Show explanation in a new editor
        const doc = await vscode.workspace.openTextDocument({
          content: `# Code Explanation\n\n${explanation}`,
          language: 'markdown'
        });
        await vscode.window.showTextDocument(doc);
      });
    }
  );
  
  // Register "Refactor Code" command
  const refactorCommand = vscode.commands.registerCommand(
    'mcpilot.refactorCode',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      
      const document = editor.document;
      const text = document.getText();
      
      const refactoring = await sdk.ask(
        `Suggest refactoring improvements for this code:\n${text}`,
        { useTools: true }
      );
      
      // Apply refactoring suggestions
      const edit = new vscode.WorkspaceEdit();
      edit.replace(
        document.uri,
        new vscode.Range(0, 0, document.lineCount, 0),
        refactoring
      );
      await vscode.workspace.applyEdit(edit);
    }
  );
  
  // Register "Generate Tests" command
  const testCommand = vscode.commands.registerCommand(
    'mcpilot.generateTests',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      
      const text = editor.document.getText();
      const language = editor.document.languageId;
      
      const tests = await sdk.ask(
        `Generate unit tests for this ${language} code:\n${text}`,
        { useTools: true }
      );
      
      // Create test file
      const testFileName = editor.document.fileName.replace(
        /\.(\w+)$/, 
        `.test.$1`
      );
      const uri = vscode.Uri.file(testFileName);
      
      const edit = new vscode.WorkspaceEdit();
      edit.createFile(uri, { overwrite: true });
      edit.insert(uri, new vscode.Position(0, 0), tests);
      
      await vscode.workspace.applyEdit(edit);
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc);
    }
  );
  
  context.subscriptions.push(explainCommand, refactorCommand, testCommand);
}

export function deactivate() {}
```

### Example 4: Automated Documentation Generator
```typescript
import { MCPilotSDK } from '@mcpilotx/sdk-core';
import fs from 'fs/promises';
import path from 'path';

class DocumentationGenerator {
  private sdk: MCPilotSDK;
  
  constructor() {
    this.sdk = new MCPilotSDK({
      ai: {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY
      }
    });
  }
  
  async generateAPIDocs(sourceDir: string, outputDir: string): Promise<void> {
    const files = await this.findSourceFiles(sourceDir);
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const relativePath = path.relative(sourceDir, file);
      
      // Generate documentation using AI
      const docs = await this.sdk.ask(
        `Generate comprehensive API documentation for this code:\n${content}`,
        { useTools: false }
      );
      
      // Save documentation
      const outputFile = path.join(
        outputDir, 
        relativePath.replace(/\.\w+$/, '.md')
      );
      await fs.mkdir(path.dirname(outputFile), { recursive: true });
      await fs.writeFile(outputFile, docs);
      
      console.log(`Generated docs for: ${relativePath}`);
    }
  }
  
  async generateReadme(projectDir: string): Promise<void> {
    const packageJson = JSON.parse(
      await fs.readFile(path.join(projectDir, 'package.json'), 'utf-8')
    );
    
    const readmeContent = await this.sdk.ask(
      `Generate a comprehensive README.md for a project with:\n` +
      `Name: ${packageJson.name}\n` +
      `Description: ${packageJson.description || 'No description'}\n` +
      `Version: ${packageJson.version}\n` +
      `Include installation, usage, API reference, and examples.`,
      { useTools: true }
    );
    
    await fs.writeFile(
      path.join(projectDir, 'README.md'),
      readmeContent
    );
  }
  
  private async findSourceFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git') {
          files.push(...await this.findSourceFiles(fullPath));
        }
      } else if (this.isSourceFile(entry.name)) {
        files.push(fullPath);
      }
    }
    
    return files;
  }
  
  private isSourceFile(filename: string): boolean {
    return /\.(ts|js|tsx|jsx|py|java|cpp|go|rs)$/.test(filename);
  }
}

// Usage
const generator = new DocumentationGenerator();
await generator.generateAPIDocs('./src', './docs/api');
await generator.generateReadme('.');
```

### Key Benefits for Development Tools:
1. **Context-Aware Assistance** - AI understands your codebase
2. **Tool Integration** - Access filesystem, git, APIs directly
3. **Smart Filtering** - Our improved transport layer filters noise from tool output
4. **Multi-line JSON Support** - Handle complex tool responses seamlessly
5. **Error Resilience** - Built-in retry and error handling

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 📄 License

Apache 2.0 - See [LICENSE](LICENSE) for details.

## 🆘 Support

- **Documentation**: See [docs/](docs/) for detailed guides
- **Issues**: [GitHub Issues](https://github.com/MCPilotX/sdk-core/issues)
- **Examples**: Check [examples/](examples/) directory

## 🚀 Ready to Build?

Start building intelligent applications today with MCPilot SDK Core!

```typescript
import { MCPilotSDK } from '@mcpilotx/sdk-core';

const sdk = new MCPilotSDK();
const future = await sdk.ask("What amazing things can I build with this SDK?");
console.log(future);
```

---

**Built with ❤️ by the MCPilot Team**
