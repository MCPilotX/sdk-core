import { createSDK } from './dist/index.js';
import { ParameterMapper, ValidationLevel } from './dist/mcp/parameter-mapper.js';
import dotenv from 'dotenv';

dotenv.config();

// 全局配置：绕过 SDK 的自动映射和必填校验逻辑
ParameterMapper.configure({
  validationLevel: ValidationLevel.LENIENT,
  enforceRequired: false,
  logWarnings: true
});

async function testAIResponse() {
  console.log('🚀 测试 AI 响应格式...');

  const sdk = createSDK();

  // 配置 AI
  await sdk.configureAI({
    provider: process.env.AI_PROVIDER || 'deepseek',
    apiKey: process.env.AI_API_KEY,
    model: process.env.AI_MODEL || 'deepseek-chat'
  });

  const testPrompt = `请分析以下 GitHub PR 内容并给出评审意见：
PR 标题: Test PR
PR 描述: This is a test PR description.
变更文件: Test file changes

请提供：
1. 功能总结
2. 潜在风险点
3. 改进建议
请使用 Markdown 格式。`;

  console.log('发送测试查询...');
  const aiResult = await sdk.ask(testPrompt);
  
  console.log('\n=== AI 响应对象 ===');
  console.log('完整响应:', JSON.stringify(aiResult, null, 2));
  console.log('\n=== 响应字段 ===');
  console.log('类型 (type):', aiResult.type);
  console.log('消息 (message):', aiResult.message);
  console.log('工具 (tool):', aiResult.tool);
  console.log('建议 (suggestions):', aiResult.suggestions);
  console.log('帮助 (help):', aiResult.help);
  console.log('置信度 (confidence):', aiResult.confidence);
  
  // 尝试访问 answer 字段
  console.log('答案 (answer):', aiResult.answer);
  
  await sdk.disconnectAll();
}

testAIResponse().catch(console.error);