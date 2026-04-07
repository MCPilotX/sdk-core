/**
 * IntentOrch Intent-Driven Demo
 * 
 * This example demonstrates the core functionality of IntentOrch:
 * 1. Parsing natural language intents
 * 2. Orchestrating MCP tools
 * 3. Executing workflows
 * 
 * Run with: npx tsx examples/intent-driven-demo.ts
 */

import { createSDK } from '../src/index';

async function demonstrateIntentOrch() {
  console.log('🚀 IntentOrch Intent-Driven Demo\n');
  
  // ==================== Part 1: Basic SDK Setup ====================
  
  console.log('📦 Part 1: Setting up IntentOrch SDK');
  console.log('--------------------------------------');
  
  const sdk = createSDK({
    logger: {
      info: (msg) => console.log(`   [INFO] ${msg}`),
      error: (msg) => console.log(`   [ERROR] ${msg}`),
      debug: (msg) => console.log(`   [DEBUG] ${msg}`),
    }
  });
  
  console.log('✅ SDK created successfully');
  
  // ==================== Part 2: Initialize Cloud Intent Engine ====================
  
  console.log('\n🧠 Part 2: Initializing Cloud Intent Engine');
  console.log('--------------------------------------------');
  
  try {
    await sdk.initCloudIntentEngine();
    console.log('✅ Cloud Intent Engine initialized');
    
    const status = sdk.getCloudIntentEngineStatus();
    console.log(`   Status: ${status.initialized ? 'Ready' : 'Not ready'}`);
    console.log(`   Available tools: ${status.availableTools}`);
  } catch (error) {
    console.log('⚠️  Cloud Intent Engine initialization skipped (AI not configured)');
    console.log(`   Note: Configure AI with sdk.configureAI() for full functionality`);
  }
  
  // ==================== Part 3: Tool Management ====================
  
  console.log('\n🔧 Part 3: Tool Management');
  console.log('---------------------------');
  
  // Register a custom tool to demonstrate tool registry
  sdk.toolRegistry.registerTool({
    name: 'demo_greeting',
    description: 'Generate a personalized greeting',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        timeOfDay: { 
          type: 'string', 
          enum: ['morning', 'afternoon', 'evening'] 
        }
      },
      required: ['name']
    }
  }, async (args: any) => {
    const { name, timeOfDay = 'day' } = args;
    const greetings = {
      morning: 'Good morning',
      afternoon: 'Good afternoon', 
      evening: 'Good evening',
      day: 'Hello'
    };
    return { 
      greeting: `${greetings[timeOfDay as keyof typeof greetings]}, ${name}!`,
      timestamp: new Date().toISOString()
    };
  }, 'demo-tools', 'greeting-tool');
  
  console.log('✅ Custom tool "demo_greeting" registered');
  
  // List available tools
  const tools = sdk.listTools();
  console.log(`📦 Total tools available: ${tools.length}`);
  
  if (tools.length > 0) {
    console.log('   First 3 tools:');
    tools.slice(0, 3).forEach((tool, index) => {
      console.log(`   ${index + 1}. ${tool.name} - ${tool.description}`);
    });
  }
  
  // ==================== Part 4: Execute Custom Tool ====================
  
  console.log('\n⚡ Part 4: Executing Custom Tool');
  console.log('---------------------------------');
  
  try {
    const result = await sdk.executeTool('demo_greeting', {
      name: 'IntentOrch Developer',
      timeOfDay: 'afternoon'
    });
    
    console.log('✅ Tool execution successful');
    console.log(`   Result: ${JSON.stringify(result, null, 2)}`);
  } catch (error) {
    console.log(`❌ Tool execution failed: ${error.message}`);
  }
  
  // ==================== Part 5: Runtime Detection ====================
  
  console.log('\n🔍 Part 5: Runtime Detection');
  console.log('-----------------------------');
  
  try {
    const { EnhancedRuntimeDetector } = await import('../src/index');
    const detection = await EnhancedRuntimeDetector.detect('.');
    
    console.log('✅ Runtime detection completed');
    console.log(`   Detected runtime: ${detection.runtime}`);
    console.log(`   Confidence: ${detection.confidence}`);
    console.log(`   Source: ${detection.source}`);
    
    if (detection.runtime === 'node') {
      console.log('   🎯 This is a Node.js project - perfect for IntentOrch!');
    }
  } catch (error) {
    console.log('⚠️  Runtime detection skipped (module not available in dev mode)');
  }
  
  // ==================== Part 6: Intent-Driven Workflow Simulation ====================
  
  console.log('\n🤖 Part 6: Intent-Driven Workflow Simulation');
  console.log('--------------------------------------------');
  
  console.log('Simulating intent-driven workflow without AI configuration:');
  console.log('');
  console.log('1. User intent: "Analyze project structure and suggest improvements"');
  console.log('2. IntentOrch would:');
  console.log('   - Parse the intent into atomic steps');
  console.log('   - Select appropriate MCP tools');
  console.log('   - Create dependency graph');
  console.log('   - Execute tools in correct order');
  console.log('   - Aggregate results');
  console.log('');
  console.log('To enable full intent-driven workflows:');
  console.log('1. Configure AI provider:');
  console.log('   await sdk.configureAI({');
  console.log('     provider: "deepseek",');
  console.log('     apiKey: process.env.DEEPSEEK_API_KEY');
  console.log('   })');
  console.log('');
  console.log('2. Connect MCP servers:');
  console.log('   await sdk.connectMCPServer({');
  console.log('     name: "filesystem",');
  console.log('     transport: { type: "stdio", command: "npx",');
  console.log('       args: ["@modelcontextprotocol/server-filesystem", "."] }');
  console.log('   })');
  console.log('');
  console.log('3. Execute intent:');
  console.log('   const result = await sdk.executeIntent("Your natural language request")');
  
  // ==================== Part 7: SDK Status Summary ====================
  
  console.log('\n📊 Part 7: SDK Status Summary');
  console.log('-----------------------------');
  
  const config = sdk.getConfig();
  console.log('SDK Configuration:');
  console.log(`   Initialized: ${sdk['initialized'] ? 'Yes' : 'No'}`);
  console.log(`   AI Configured: ${config.ai?.provider ? 'Yes' : 'No'}`);
  console.log(`   MCP Servers: ${sdk.listMCPServers().length}`);
  console.log(`   Available Tools: ${sdk.listTools().length}`);
  console.log(`   Cloud Intent Engine: ${sdk.getCloudIntentEngineStatus().initialized ? 'Ready' : 'Not ready'}`);
  
  // ==================== Part 8: Next Steps ====================
  
  console.log('\n🚀 Part 8: Next Steps for Developers');
  console.log('-------------------------------------');
  
  console.log('To get started with IntentOrch:');
  console.log('');
  console.log('1. **Quick Start**:');
  console.log('   npm install @mcpilotx/intentorch');
  console.log('   import { createSDK } from "@mcpilotx/intentorch"');
  console.log('');
  console.log('2. **Configure AI**:');
  console.log('   Get API key from DeepSeek/OpenAI');
  console.log('   await sdk.configureAI({ provider: "deepseek", apiKey: "..." })');
  console.log('');
  console.log('3. **Connect MCP Servers**:');
  console.log('   Install MCP servers: npm install @modelcontextprotocol/server-filesystem');
  console.log('   await sdk.connectMCPServer({...})');
  console.log('');
  console.log('4. **Execute Intents**:');
  console.log('   const result = await sdk.executeIntent("Your request here")');
  console.log('');
  console.log('5. **Explore Examples**:');
  console.log('   Check examples/ directory for more use cases');
  console.log('');
  console.log('🎉 Demo completed! IntentOrch is ready to transform your intents into actions.');
}

// Run the demo
demonstrateIntentOrch().catch((error) => {
  console.error('❌ Demo failed:', error);
  process.exit(1);
});