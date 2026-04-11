import { createSDK } from '@mcpilotx/intentorch';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
    // 1. 创建 SDK 实例
    const sdk = createSDK();

    // 2. 配置 AI 大模型 (使用 .env 文件存储 API Key 更安全)
    // mv env_example .env (编辑.env替换api-key为你自己的)
    await sdk.configureAI({
        provider: 'deepseek',   // 可选: openai, ollama, deepseek 等
        apiKey: process.env.DEEPSEEK_API_KEY,
        model: 'deepseek-chat'
    });

    // 3. 连接 12306 MCP Server
    await sdk.connectMCPServer({
        name: '12306-mcp',
        transport: {
            type: 'stdio',
            command: 'npx',
            args: ['-y', '12306-mcp']
        }
    });

    // 4. 初始化 Cloud Intent Engine
    await sdk.initCloudIntentEngine();

    // 5. 执行意图：用自然语言查询火车票
    const result = await sdk.executeWorkflowWithTracking(
        "查询 2026 年 4 月 15 日北京到上海的所有高铁票"
    );

    // 6. 输出结果
    console.log('查询结果:', result.result);
}

main().catch(console.error);
