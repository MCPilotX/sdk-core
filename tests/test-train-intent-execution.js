/**
 * Test script to execute the train ticket intent
 * Tests: "查询2026年5月1日广州到长沙的高铁票"
 */

const { getIntentService } = require('./dist/src/intent/intent-service.js');

async function testTrainTicketIntent() {
  console.log('Testing train ticket intent execution');
  console.log('===============================================\n');
  
  // Create intent service with DeepSeek configuration
  const intentService = getIntentService({
    provider: 'deepseek',
 apiKey:'sk-3f84be7f0dfb4c00ad480815602f09be',   
model: 'deepseek-chat'
  });
  
  // Test intent
  const intent = '查询2026年5月1日广州到长沙的高铁票';
  const context = {
    availableServers: ['train-ticket-mcp', '12306-mcp'],
    userPreferences: {
      preferredClass: 'second',
      maxPrice: 500
    }
  };
  
  console.log(`Intent: "${intent}"`);
  console.log('Context:', JSON.stringify(context, null, 2));
  console.log('\nParsing intent...\n');
  
  try {
    // Parse the intent
    const result = await intentService.parseIntent({
      intent,
      context
    });
    
    console.log('Parse Result:');
    console.log('Success:', result.success);
    
    if (result.success && result.data) {
      console.log('Status:', result.data.status);
      console.log('Confidence:', result.data.confidence);
      console.log('Explanation:', result.data.explanation);
      console.log('\nGenerated Steps:');
      
      if (result.data.steps && result.data.steps.length > 0) {
        result.data.steps.forEach((step, index) => {
          console.log(`\nStep ${index + 1}:`);
          console.log('  ID:', step.id);
          console.log('  Server:', step.serverId);
          console.log('  Tool:', step.toolName);
          console.log('  Parameters:', JSON.stringify(step.parameters, null, 2));
        });
        
        // Simulate execution of steps
        console.log('\nSimulating execution...');
        for (const step of result.data.steps) {
          console.log(`\nExecuting: ${step.toolName} on ${step.serverId}`);
          console.log('With parameters:', JSON.stringify(step.parameters, null, 2));
          
          // In a real scenario, this would call the actual MCP server
          // For now, we just simulate the execution
          if (step.serverId.includes('train') || step.toolName.includes('train')) {
            console.log('Simulating train ticket search...');
            console.log('Searching for trains from Guangzhou to Changsha on 2026-05-01');
            console.log('Filtering by high-speed rail (高铁)');
            console.log('Checking availability and prices...');
            console.log('Found 15 available trains');
            console.log('Best match: G1001, 08:00-11:30, ¥328 (Second Class)');
          }
        }
      } else {
        console.log('No specific steps generated. Using generic execution.');
        console.log('\nGeneric execution would:');
        console.log('1. Search for train tickets from Guangzhou to Changsha');
        console.log('2. Filter for high-speed rail (高铁)');
        console.log('3. Check availability for 2026-05-01');
        console.log('4. Return available options with prices');
      }
    } else if (result.error) {
      console.log('Error:', result.error);
    }
    
  } catch (error) {
    console.error('Error during intent parsing/execution:', error);
  }
  
  console.log('\n===============================================');
  console.log('Test completed');
}

// Run the test
testTrainTicketIntent().catch(console.error);
