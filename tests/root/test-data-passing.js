/**
 * 测试数据传递问题
 * 这个脚本用于调试为什么Slack消息内容是"来自 A3 的输出"而不是实际的AI分析结果
 */

import { createSDK } from './dist/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function testDataPassing() {
  console.log('🧪 测试数据传递问题...\n');

  const sdk = createSDK({
    logger: {
      info: (msg) => console.log(`[INFO] ${msg}`),
      error: (msg) => console.log(`[ERROR] ${msg}`),
      debug: (msg) => console.log(`[DEBUG] ${msg}`),
    }
  });

  try {
    // 配置 AI
    await sdk.configureAI({
      provider: process.env.AI_PROVIDER || 'deepseek',
      apiKey: process.env.AI_API_KEY,
      model: process.env.AI_MODEL || 'deepseek-chat'
    });

    // 初始化 Cloud Intent Engine
    await sdk.initCloudIntentEngine();

    // 测试简单的工作流
    const testQuery = "获取当前时间，然后@intentorch分析时间信息，最后输出结果";
    
    console.log('🤖 测试查询:');
    console.log(`   "${testQuery}"\n`);
    
    console.log('🔍 解析工作流计划...');
    const planResult = await sdk.parseAndPlanWorkflow(testQuery);
    
    if (planResult.success && planResult.plan) {
      const plan = planResult.plan;
      
      console.log('✅ 工作流计划创建成功!\n');
      
      console.log('📝 解析出的意图:');
      plan.parsedIntents.forEach((intent, index) => {
        console.log(`   ${index + 1}. [${intent.id}] ${intent.description}`);
        console.log(`       类型: ${intent.type}`);
        console.log(`       参数: ${JSON.stringify(intent.parameters, null, 2)}`);
      });

      console.log('\n🛠️  工具选择:');
      plan.toolSelections.forEach((selection, index) => {
        console.log(`   ${index + 1}. ${selection.toolName}`);
        console.log(`       对应意图: ${selection.intentId}`);
        console.log(`       映射参数: ${JSON.stringify(selection.mappedParameters, null, 2)}`);
      });

      console.log('\n🔗 依赖关系:');
      if (plan.dependencies.length > 0) {
        plan.dependencies.forEach((dep, index) => {
          console.log(`   ${index + 1}. ${dep.from} → ${dep.to}`);
        });
      }

      console.log('\n⏱️  执行顺序:');
      console.log(`   ${plan.executionOrder.join(' → ')}`);
      
      // 检查参数映射中的变量替换
      console.log('\n🔍 检查参数映射中的变量替换:');
      plan.toolSelections.forEach((selection, index) => {
        console.log(`   ${selection.toolName} 的参数映射:`);
        Object.entries(selection.mappedParameters).forEach(([key, value]) => {
          console.log(`     ${key}: ${value}`);
          if (typeof value === 'string' && value.includes('{{')) {
            console.log(`       ✅ 包含变量替换: ${value}`);
          }
        });
      });
      
    } else {
      console.log('❌ 工作流计划创建失败!');
      console.log(`   错误: ${planResult.error}`);
    }

  } catch (error) {
    console.error('\n💥 测试异常:', error);
  }
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  testDataPassing().catch((error) => {
    console.error('❌ 测试执行失败:', error);
    process.exit(1);
  });
}