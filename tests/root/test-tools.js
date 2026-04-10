import { createSDK } from './dist/index.js';
import { ParameterMapper, ValidationLevel } from './dist/mcp/parameter-mapper.js';
import dotenv from 'dotenv';

dotenv.config();

ParameterMapper.configure({
  validationLevel: ValidationLevel.LENIENT,
  enforceRequired: false,
  logWarnings: true
});

async function testTools() {
  console.log('🚀 测试工具列表...');

  const sdk = createSDK();

  // 配置 AI
  await sdk.configureAI({
    provider: process.env.AI_PROVIDER || 'deepseek',
    apiKey: process.env.AI_API_KEY,
    model: process.env.AI_MODEL || 'deepseek-chat'
  });

  // 连接 GitHub 服务器
  await sdk.connectMCPServer({
    name: 'github',
    transport: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: { GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN }
    }
  });

  console.log('✅ GitHub 服务器连接成功');

  // 列出所有工具
  const tools = sdk.getTools();
  console.log('\n📋 可用的工具列表:');
  tools.forEach((tool, index) => {
    console.log(`\n${index + 1}. ${tool.name}`);
    console.log(`   描述: ${tool.description}`);
    if (tool.inputSchema) {
      console.log(`   输入参数:`, JSON.stringify(tool.inputSchema, null, 2));
    }
  });

  await sdk.disconnectAll();
}

testTools().catch(console.error);