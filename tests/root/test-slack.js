import { createSDK } from './dist/index.js';
import dotenv from 'dotenv';
dotenv.config();

async function testSlack() {
  const sdk = createSDK();
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

  try {
    console.log('正在获取 Slack 频道列表...');
    const result = await sdk.executeTool('slack_list_channels', { limit: 10 });
    console.log('结果:', JSON.stringify(result.content, null, 2));
  } catch (error) {
    console.error('Slack 错误:', error.message);
  }
  await sdk.disconnectAll();
}
testSlack();
