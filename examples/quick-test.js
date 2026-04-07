/**
 * Quick Test: Verify DeepSeek API and Intent Engine Basic Functionality
 */

import { CloudIntentEngine } from './package/dist/ai/cloud-intent-engine.js';

// Check environment variables
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_TOKEN;

if (!DEEPSEEK_API_KEY) {
  console.error('❌ Error: DeepSeek API token not found');
  console.error('Please set environment variable:');
  console.error('  export DEEPSEEK_API_KEY=your_api_key_here');
  console.error('or');
  console.error('  export DEEPSEEK_TOKEN=your_api_key_here');
  process.exit(1);
}

console.log('🔑 DeepSeek API token detected');
console.log('Starting quick test...\n');

async function quickTest() {
  try {
    // 1. Create Intent Engine
    console.log('1. Creating CloudIntentEngine...');
    const engine = new CloudIntentEngine({
      llm: {
        provider: 'deepseek',
        apiKey: DEEPSEEK_API_KEY,
        model: 'deepseek-chat',
        temperature: 0.1
      }
    });

    console.log('✅ Engine created successfully\n');

    // Initialize engine (configure AI service)
    console.log('Initializing engine...');
    await engine.initialize();
    console.log('✅ Engine initialized successfully\n');

    // 2. Set up simple tools
    console.log('2. Setting up mock tools...');
    engine.setAvailableTools([
      {
        name: 'read_file',
        description: 'Read a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' }
          },
          required: ['path']
        }
      }
    ]);

    console.log('✅ Tools set up successfully\n');

    // 3. Test simple intent parsing
    console.log('3. Testing intent parsing...');
    console.log('Query: "hello"');

    try {
      const result = await engine.parseIntent("hello");
      console.log(`✅ Intent parsing successful`);
      console.log(`Number of intents: ${result.intents.length}`);
    } catch (error) {
      console.log(`⚠ Intent parsing failed (may need initialization): ${error.message}`);
    }

    console.log('\n🎉 Quick test completed!');
    console.log('\nNext steps:');
    console.log('1. Run full test: node mcp-integration-test.js');
    console.log('2. Or run simplified test: node final-mvp-test.js');
    console.log('3. Make sure correct DeepSeek API token is set');

  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    console.error(error.stack);
  }
}

// Run test
quickTest().catch(console.error);