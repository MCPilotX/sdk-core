/**
 * 调试数据传递问题
 */

import { createSDK } from './dist/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function testDebugData() {
  console.log('🐛 调试数据传递问题...\n');

  const sdk = createSDK({
    logger: {
      info: (msg) => console.log(`[INFO] ${msg}`),
      error: (msg) => console.log(`[ERROR] ${msg}`),
      debug: (msg) => console.log(`[DEBUG] ${msg}`), // 启用调试日志
      warn: (msg) => console.log(`[WARN] ${msg}`)
    }
  });

  try {
    // 配置 AI
    await sdk.configureAI({
      provider: process.env.AI_PROVIDER || 'deepseek',
      apiKey: process.env.AI_API_KEY,
      model: process.env.AI_MODEL || 'deepseek-chat'
    });

    // 连接 MCP 服务器
    console.log('🔗 连接 MCP 服务器...');
    
    await sdk.connectMCPServer({
      name: 'github',
      transport: {
        type: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
        env: { GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN }
      }
    });

    await sdk.connectMCPServer({
      name: 'slack',
      transport: {
        type: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-slack'],
        env: { 
          SLACK_BOT_TOKEN: process.env.SLACK_TOKEN,
          SLACK_TEAM_ID: process.env.SLACK_TEAM_ID
        }
      }
    });

    // 初始化 Cloud Intent Engine
    await sdk.initCloudIntentEngine();

    // 测试简单的工作流
    const testQuery = "获取 GitHub 仓库 facebook/react 的 PR #1 的详情，然后@intentorch分析这个PR";
    
    console.log('🤖 测试查询:');
    console.log(`   "${testQuery}"\n`);
    
    console.log('🔍 执行工作流...');
    
    const result = await sdk.executeWorkflowWithTracking(
      testQuery,
      {
        onStepStarted: (step) => {
          console.log(`   ▶️  开始步骤: ${step.intentDescription}`);
          console.log(`       工具: ${step.toolName}`);
          console.log(`       意图ID: ${step.intentId}`);
        },
        onStepCompleted: (step) => {
          console.log(`   ✅ 步骤完成: ${step.intentDescription}`);
          console.log(`       状态: ${step.success ? '成功' : '失败'}`);
          console.log(`       意图ID: ${step.intentId}`);
          console.log(`       结果类型: ${typeof step.result}`);
          if (step.result) {
            console.log(`       结果结构: ${Object.keys(step.result).join(', ')}`);
            // 如果是AI结果，显示内容预览
            if (step.toolName === 'ai.summary' && step.result.content) {
              console.log(`       AI结果预览: ${step.result.content.substring(0, 100)}...`);
            }
          }
          if (step.duration) {
            console.log(`       耗时: ${step.duration}ms`);
          }
          console.log('');
        }
      }
    );

    console.log('\n📊 最终结果:');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('\n💥 调试异常:', error);
  } finally {
    await sdk.disconnectAll();
  }
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  testDebugData().catch((error) => {
    console.error('❌ 调试执行失败:', error);
    process.exit(1);
  });
}