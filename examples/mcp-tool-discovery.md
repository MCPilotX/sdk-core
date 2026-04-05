# MCP 工具发现机制详解

## stdio 模式下 MCP 工具是如何发现的？

### 整体流程
```
启动 SDK → 连接 MCP 服务器 → 发送 tools/list 请求 → 解析响应 → 注册工具
```

### 详细步骤

#### 1. SDK 初始化
```typescript
const sdk = new MCPilotSDK({
  mcp: {
    servers: [{
      transport: {
        type: 'stdio',
        command: 'npx',
        args: ['@agent-infra/mcp-server-filesystem']
      }
    }]
  }
});
```

#### 2. 连接 MCP 服务器
```typescript
// 在 connectMCPServer 方法中
const client = new MCPClient(config);
await client.connect();  // ← 启动子进程，建立 stdio 连接
```

#### 3. 启动子进程（stdio 传输）
```typescript
// StdioTransport.connect() 方法
this.process = spawn(this.config.command!, this.config.args || [], {
  stdio: ['pipe', 'pipe', 'pipe']  // stdin, stdout, stderr
});
```

#### 4. 发送 tools/list 请求
```typescript
// MCPClient.listTools() 方法
async listTools(): Promise<Tool[]> {
  const response = await this.sendRequest(MCP_METHODS.TOOLS_LIST);
  // MCP_METHODS.TOOLS_LIST = 'tools/list'
  const toolList = response as ToolList;
  this.tools = toolList.tools;
  return this.tools;
}
```

#### 5. 发送 JSONRPC 请求
```typescript
// MCPClient.sendRequest() 方法
const request: JSONRPCRequest = {
  jsonrpc: '2.0',
  id: 'req_1',
  method: 'tools/list',
  params: {}  // 通常为空
};

await this.transport.send(request);
```

#### 6. 通过 stdio 发送请求
```typescript
// StdioTransport.send() 方法
const data = JSON.stringify(request) + '\n';
this.process.stdin.write(data);
```

#### 7. MCP 服务器处理请求
服务器收到 JSONRPC 请求：
```json
{
  "jsonrpc": "2.0",
  "id": "req_1",
  "method": "tools/list",
  "params": {}
}
```

服务器通过 stdout 返回响应：
```json
{
  "jsonrpc": "2.0",
  "id": "req_1",
  "result": {
    "tools": [
      {
        "name": "read_file",
        "description": "Read file contents",
        "inputSchema": {
          "type": "object",
          "properties": {
            "path": {"type": "string"}
          },
          "required": ["path"]
        }
      },
      {
        "name": "write_file",
        "description": "Write content to file",
        "inputSchema": {
          "type": "object",
          "properties": {
            "path": {"type": "string"},
            "content": {"type": "string"}
          },
          "required": ["path", "content"]
        }
      }
    ]
  }
}
```

#### 8. SDK 接收并解析响应
```typescript
// StdioTransport 处理 stdout 输出
this.process.stdout?.on('data', (data: Buffer) => {
  this.handleMessage(data.toString());  // ← 解析 JSON，提取工具列表
});
```

#### 9. 注册工具到工具注册表
```typescript
// SDK.registerMCPServerTools() 方法
private registerMCPServerTools(serverName: string, tools: Tool[], client: MCPClient): void {
  tools.forEach(tool => {
    const executor = async (args: Record<string, any>): Promise<ToolResult> => {
      return await client.callTool(tool.name, args);
    };
    
    this.toolRegistry.registerMCPTool(tool, executor, serverName, serverName);
  });
}
```

#### 10. 工具注册表存储
```typescript
// ToolRegistry.registerMCPTool() 方法
registerMCPTool(tool: Tool, executor: ToolExecutor, serverId: string): void {
  const registeredTool: RegisteredTool = {
    tool,
    executor,
    metadata: {
      serverId,
      discoveredAt: Date.now(),
      usageCount: 0
    }
  };
  
  this.tools.set(tool.name, registeredTool);
}
```

### 关键组件

#### 1. MCP 协议消息格式
```json
// 请求
{
  "jsonrpc": "2.0",
  "id": "unique-id",
  "method": "tools/list",
  "params": {}
}

// 响应
{
  "jsonrpc": "2.0",
  "id": "unique-id",
  "result": {
    "tools": [...]
  }
}
```

#### 2. 工具数据结构
```typescript
interface Tool {
  name: string;                    // 工具名称，如 "read_file"
  description: string;             // 工具描述
  inputSchema: {                   // 输入参数模式
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}
```

#### 3. 传输层职责
- **stdio 传输**：启动子进程，通过管道通信
- **HTTP 传输**：发送 HTTP POST 请求
- **SSE 传输**：建立服务器推送连接

### 实际示例

#### 完整的工具发现流程
```typescript
async function discoverTools() {
  // 1. 创建 SDK 实例
  const sdk = new MCPilotSDK({
    mcp: {
      servers: [{
        transport: {
          type: 'stdio',
          command: 'npx',
          args: ['@agent-infra/mcp-server-filesystem']
        }
      }]
    }
  });
  
  // 2. 初始化 MCP 功能
  await sdk.initMCP();
  
  // 3. 列出所有发现的工具
  const tools = sdk.listTools();
  console.log('Discovered tools:', tools);
  
  // 输出示例：
  // [
  //   {
  //     name: 'read_file',
  //     description: 'Read file contents',
  //     serverName: 'mcp-server-123456789'
  //   },
  //   {
  //     name: 'write_file',
  //     description: 'Write content to file',
  //     serverName: 'mcp-server-123456789'
  //   }
  // ]
}
```

### 调试技巧

#### 1. 查看原始通信
```bash
# 手动测试 MCP 服务器
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npx @agent-infra/mcp-server-filesystem
```

#### 2. 查看 SDK 日志
```typescript
const sdk = new MCPilotSDK({
  logger: {
    info: (msg) => console.log(`[INFO] ${msg}`),
    error: (msg) => console.error(`[ERROR] ${msg}`),
    debug: (msg) => console.debug(`[DEBUG] ${msg}`)
  }
});
```

#### 3. 检查工具注册状态
```typescript
// 获取工具统计信息
const stats = sdk.getToolStatistics();
console.log('Tool stats:', stats);
// 输出：{ totalTools: 2, byServer: { 'server-1': 2 } }
```

### 常见问题

#### Q: 为什么需要发送 `tools/list` 请求？
A: 这是 MCP 协议的标准方法，用于获取服务器支持的所有工具列表。

#### Q: 工具发现是自动的吗？
A: 是的，当 `autoConnect: true` 时，SDK 会自动连接服务器并发现工具。

#### Q: 如何手动刷新工具列表？
A: 可以调用 `sdk.initMCP()` 重新初始化，或直接操作 MCPClient。

#### Q: 工具信息存储在哪里？
A: 存储在 `ToolRegistry` 中，可以通过 `sdk.listTools()` 访问。

### 总结

stdio 模式下 MCP 工具的发现过程：
1. **启动子进程**：通过 stdio 与 MCP 服务器通信
2. **发送标准请求**：使用 JSONRPC 格式发送 `tools/list` 方法
3. **解析响应**：从服务器响应中提取工具定义
4. **注册工具**：将工具注册到 SDK 的工具注册表
5. **提供访问接口**：通过 `sdk.listTools()` 等方法暴露给用户

这个过程是 MCP 协议的核心功能，使得 SDK 能够动态发现和使用服务器提供的工具。