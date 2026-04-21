import { Command } from 'commander';
import { getAIConfig } from '@intentorch/core';
import { getRegistryClient } from '@intentorch/core';
import { getProcessManager } from '@intentorch/core';
import { getWorkflowManager } from '@intentorch/core';
import { WorkflowEngine } from '@intentorch/core';
import { getToolRegistry } from '@intentorch/core';
import { AutoStartManager } from '@intentorch/core';
import fs from 'fs/promises';
import { PROGRAM_NAME } from '@intentorch/core';
import { printError } from '@intentorch/core';

/**
 * Convert MCP response format to standard format
 * MCP response: { content: [{ type: "text", text: "..." }] }
 * Standard format: { result: ... }
 */
function convertMCPResponse(response: any): any {
  if (!response) return response;
  
  // If response already has result field, return as is
  if (response.result !== undefined) {
    return response;
  }
  
  // Convert content array to result
  if (response.content && Array.isArray(response.content)) {
    // Extract text from content
    const textContent = response.content
      .filter((item: any) => item.type === 'text')
      .map((item: any) => item.text)
      .join('\n');
    
    // If there's text content, return it as result
    if (textContent) {
      return { ...response, result: textContent };
    }
    
    // If there's only one content item, return it directly
    if (response.content.length === 1) {
      return { ...response, result: response.content[0] };
    }
  }
  
  // Return original response if we can't convert it
  return response;
}

/**
 * Convert step results in execution steps
 */
function convertStepResults(executionSteps: any[]): any[] {
  if (!executionSteps || !Array.isArray(executionSteps)) {
    return executionSteps;
  }
  
  return executionSteps.map(step => {
    if (step.result) {
      return {
        ...step,
        result: convertMCPResponse(step.result)
      };
    }
    return step;
  });
}

export function runCommand(): Command {
  const command = new Command('run')
    .description('Execute natural language workflow, JSON workflow file, or named workflow')
    .argument('<input>', 'Natural language query, JSON file path, or workflow name')
    .option('--auto-start', 'Automatically pull and start required Server')
    .option('--keep-alive', 'Keep Server running after execution (only with --auto-start)')
    .option('-p, --params <json>', 'Parameters for named workflow or file (JSON format)', '{}')
    .option('--silent', 'Suppress verbose logs and initialization messages')
    .option('--simulate', 'Run in simulation mode (no real MCP Server required)')
    .action(async (input: string, options) => {
      try {
        const workflowManager = getWorkflowManager();
        const workflowEngine = new WorkflowEngine();
        let params = {};
        try {
          params = JSON.parse(options.params);
        } catch (e) {
          printError('Invalid JSON params');
          return;
        }

        // 1. Check if it's a JSON file
        if (input.endsWith('.json')) {
          console.log(`📄 Executing workflow from file: ${input}`);
          const data = await fs.readFile(input, 'utf-8');
          const workflow = JSON.parse(data);
          const results = await workflowEngine.execute(workflow, params);
          console.log('\n📊 Execution Results:');
          console.log(JSON.stringify(results, null, 2));
          return;
        }

        // 2. Check if it's a named workflow
        if (await workflowManager.exists(input)) {
          console.log(`🏷️  Executing named workflow: "${input}"`);
          const workflow = await workflowManager.load(input);
          const results = await workflowEngine.execute(workflow, params);
          console.log('\n📊 Execution Results:');
          console.log(JSON.stringify(results, null, 2));
          return;
        }

        // 3. Natural Language Execution
        if (!options.silent) {
          console.log('🎯 Starting natural language workflow execution');
          console.log(`📝 Query: "${input}"`);
          console.log('\n🔧 Step 1: Configure AI');
        }
        
        const aiConfig = await getAIConfig();
        
        if (!aiConfig.provider || !aiConfig.apiKey) {
          console.error('❌ AI configuration not set');
          console.log('\n💡 Please set AI configuration first:');
          console.log(`   ${PROGRAM_NAME} config set provider <openai|deepseek|...>`);
          console.log(`   ${PROGRAM_NAME} config set apiKey <your-api-key>`);
          console.log(`   ${PROGRAM_NAME} config set model <model-name> (optional)`);
          return;
        }

        // Configure IntentOrch AI - using dynamic import to avoid initialization at import time
        if (!options.silent) {
          console.log('   Configuring AI provider:', aiConfig.provider);
        }
        
        // Temporarily suppress console output BEFORE importing intentorch
        const originalConsoleLog = console.log;
        const originalConsoleInfo = console.info;
        const originalConsoleError = console.error;
        const originalConsoleWarn = console.warn;
        const originalConsoleDebug = console.debug;
        
        let intentorch: any;
        
        try {
          // Redirect all console output to empty functions
          console.log = () => {};
          console.info = () => {};
          console.error = () => {};
          console.warn = () => {};
          console.debug = () => {};
          
          // Dynamically import intentorch to avoid initialization at import time
          const importedIntentorch = await import('@intentorch/core');
          intentorch = importedIntentorch.default;
          
          await intentorch.configureAI({
            provider: aiConfig.provider,
            apiKey: aiConfig.apiKey,
            model: aiConfig.model || 'gpt-4o-mini'
          });
          
          // Initialize Cloud Intent Engine
          await intentorch.initCloudIntentEngine();
        } finally {
          // Restore original console output
          console.log = originalConsoleLog;
          console.info = originalConsoleInfo;
          console.error = originalConsoleError;
          console.warn = originalConsoleWarn;
          console.debug = originalConsoleDebug;
        }
        
        if (!options.silent) {
          console.log('✓ AI configuration completed');
          console.log('✓ Cloud Intent Engine initialized');
        }

        // 2. Handle auto-start if requested
        if (options.autoStart) {
          if (!options.silent) {
            console.log('\n🚀 Auto-start: Analyzing intent and starting required servers');
          }
          
          const autoStartManager = new AutoStartManager();
          
          // Analyze intent to determine required servers
          const requiredServers = await autoStartManager.analyzeIntentForServers(input);
          
          if (requiredServers.length === 0) {
            console.log('⚠️  No specific servers identified for auto-start');
            console.log('   The system will attempt to use available servers');
          } else {
            // Ensure servers are pulled and started
            const results = await autoStartManager.ensureServersRunning(requiredServers);
            autoStartManager.printResults(results);
            
            // Check if all servers are ready
            if (!autoStartManager.areAllServersReady(results)) {
              console.error('\n❌ Some required servers failed to start');
              console.log('\n💡 Please check:');
              console.log('1. Network connection');
              console.log('2. Server availability');
              console.log('3. Or run without --auto-start and start servers manually');
              return;
            }
            
            if (!options.silent) {
              console.log('✓ All required servers are ready');
            }
          }
        }

        // 3. Connect to running MCP Servers or use simulation mode
        let connectedServers = 0;
        
        if (options.simulate) {
          if (!options.silent) {
            console.log('\n🔌 Step 2: Simulation Mode');
            console.log('   Running in simulation mode - no real MCP Server required');
          }
          
          // Simulate connection to a test server - skip actual connection in simulation mode
          if (!options.silent) {
            console.log('   ✓ Simulated connection to 12306 MCP Server (no actual connection)');
          }
          connectedServers = 1;
        } else {
          if (!options.silent) {
            console.log('\n🔌 Step 2: Connect to MCP Servers');
          }
          
          const processManager = getProcessManager();
          let runningServers = await processManager.listRunning();
          
          // If no servers are running, we need to start them
          if (runningServers.length === 0) {
            if (!options.silent) {
              console.log('   No running MCP Servers found, checking available servers...');
            }
            
            // Use tool registry to intelligently select server based on query
            const toolRegistry = getToolRegistry();
            const suggestedTools = await toolRegistry.guessToolsForQuery(input);
            
            if (suggestedTools.length === 0) {
              console.error('   No suitable tools found for query');
              console.log('\n💡 Please check:');
              console.log('1. Have you pulled the required server?');
              console.log('2. Does the server have tools declared in its manifest?');
              console.log('3. Or use --simulate flag to run in simulation mode');
              return;
            }
            
            // Get unique servers from suggested tools
            const serversToStart = Array.from(
              new Set(suggestedTools.map(tool => tool.serverName))
            );
            
            let startedAnyServer = false;
            
            for (const serverToStart of serversToStart) {
              try {
                if (!options.silent) {
                  console.log(`   Attempting to start server: ${serverToStart}`);
                }
                
                // Check if server is pulled
                const registryClient = getRegistryClient();
                const manifest = await registryClient.getCachedManifest(serverToStart);
                
                if (!manifest) {
                  console.error(`   ❌ Server ${serverToStart} not found in cache`);
                  console.log(`   💡 Please pull the server first: ${PROGRAM_NAME} pull ${serverToStart}`);
                  continue;
                }
                
                // Start the server using ProcessManager
                const pid = await processManager.start(serverToStart);
                
                // Wait a moment for the server to start
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                if (!options.silent) {
                  console.log(`   ✓ Started ${serverToStart} (PID: ${pid})`);
                }
                startedAnyServer = true;
                
              } catch (error: any) {
                console.error(`   ❌ Failed to start server ${serverToStart}: ${error.message}`);
              }
            }
            
            if (!startedAnyServer) {
              console.error('   Failed to start any required server');
              console.log('\n💡 Please start required Server manually:');
              for (const serverToStart of serversToStart) {
                console.log(`   ${PROGRAM_NAME} pull ${serverToStart}`);
                console.log(`   ${PROGRAM_NAME} start ${serverToStart}`);
              }
              console.log('\n   Or use --simulate flag to run in simulation mode');
              return;
            }
            
            // Refresh running servers list
            runningServers = await processManager.listRunning();
          }
          
          // If still no servers running after attempting to start
          if (runningServers.length === 0) {
            console.error('❌ No running MCP Servers found and failed to start new ones');
            console.log('\n💡 Please start required Server first:');
            console.log(`   ${PROGRAM_NAME} pull @Joooook/12306-mcp`);
            console.log(`   ${PROGRAM_NAME} start @Joooook/12306-mcp`);
            console.log('\n   Or use --simulate flag to run in simulation mode');
            return;
          }

          if (!options.silent) {
            console.log(`   Found ${runningServers.length} running Servers:`);
          }
          
          for (const server of runningServers) {
            if (!options.silent) {
              console.log(`   - ${server.serverName} (PID: ${server.pid})`);
            }
            
            // Connect to running Server
            try {
              const registryClient = getRegistryClient();
              const manifest = await registryClient.getCachedManifest(server.serverName);
              
              if (manifest) {
                // Use any type to avoid type checking
                await (intentorch as any).connectMCPServer({
                  name: server.serverName,
                  transport: {
                    type: 'stdio' as const,
                    command: manifest.runtime.command,
                    args: manifest.runtime.args || []
                  }
                });
                if (!options.silent) {
                  console.log(`   ✓ Connected to ${server.serverName}`);
                }
                connectedServers++;
              } else {
                if (!options.silent) {
                  console.log(`   ⚠️  ${server.serverName}: manifest not found`);
                }
              }
            } catch (error: any) {
              console.error(`   ❌ Failed to connect to ${server.serverName}: ${error.message}`);
            }
          }

          if (connectedServers === 0) {
            console.error('\n❌ Failed to connect to any MCP Server');
            console.log('\n💡 Please check:');
            console.log('1. Is Server running properly?');
            console.log('2. Is manifest correct?');
            console.log('3. Is network connection normal?');
            console.log('\n   Or use --simulate flag to run in simulation mode');
            return;
          }
        }

        // 4. Execute workflow
        if (!options.silent) {
          console.log('\n🚀 Step 3: Execute workflow');
          console.log('   Using IntentOrch for intent recognition and orchestration...');
        }
        
        // Use any type to avoid type checking
        const result = await (intentorch as any).executeWorkflowWithTracking(input);
        
        if (!options.silent) {
          console.log('\n' + '='.repeat(50));
          console.log('🎉 Workflow execution completed');
          console.log('='.repeat(50));
        }
        
        // Use any type to handle result
        const anyResult = result as any;
        
        // Convert MCP response formats
        const convertedResult = {
          ...anyResult,
          executionSteps: convertStepResults(anyResult.executionSteps),
          result: convertMCPResponse(anyResult.result)
        };
        
        if (convertedResult.success) {
          if (!options.silent) {
            console.log(`✅ Execution successful`);
            
            // Display execution results
            if (convertedResult.executionSteps && convertedResult.executionSteps.length > 0) {
              console.log('\n📊 Execution steps:');
              for (const step of convertedResult.executionSteps) {
                const status = step.success ? '✅' : '❌';
                const stepName = step.name || step.toolName || step.tool || 'Unknown step';
                console.log(`  ${status} ${stepName}`);
                
                if (step.result) {
                  // Check if result has been converted to have result field
                  const stepResult = step.result.result || step.result;
                  
                  if (step.toolName === 'search_tickets' && stepResult.tickets) {
                    console.log(`     Found ${stepResult.tickets.length} tickets:`);
                    for (const ticket of stepResult.tickets.slice(0, 3)) {
                      console.log(`     - ${ticket.trainNo}: ${ticket.from} → ${ticket.to} ${ticket.departure}-${ticket.arrival} ${ticket.price}`);
                    }
                  } else if (step.toolName === 'get_weather' && stepResult) {
                    console.log(`     ${stepResult.location}: ${stepResult.temperature} ${stepResult.condition}`);
                  } else if (typeof stepResult === 'string') {
                    // Display text result
                    console.log(`     Result: ${stepResult.substring(0, 100)}${stepResult.length > 100 ? '...' : ''}`);
                  }
                }
              }
            }
            
            // Display final output
            if (convertedResult.result) {
              console.log('\n📋 Final output:');
              const finalResult = convertedResult.result.result || convertedResult.result;
              console.log(finalResult);
            }
          } else {
            // In silent mode, just output the result
            if (convertedResult.result) {
              const finalResult = convertedResult.result.result || convertedResult.result;
              console.log(JSON.stringify(finalResult, null, 2));
            }
          }
        } else {
          console.log(`❌ Execution failed`);
          
          if (convertedResult.error) {
            console.log(`\n📋 Error message:`);
            console.log(convertedResult.error);
          }
          
          if (convertedResult.executionSteps) {
            console.log('\n📊 Failed steps:');
            for (const step of convertedResult.executionSteps) {
              if (!step.success) {
                const stepName = step.name || step.toolName || step.tool || 'Unknown step';
                console.log(`  ❌ ${stepName}`);
                if (step.error) {
                  console.log(`     Error: ${step.error}`);
                }
              }
            }
          }
        }

        // 5. Cleanup (if not keeping connection alive)
        if (!options.keepAlive) {
          if (!options.silent) {
            console.log('\n🧹 Cleaning up connections');
          }
          // Try to disconnect from all MCP Servers
          try {
            // Use any type to avoid type checking
            const servers = (intentorch as any).getConnectedServers?.();
            if (servers && Array.isArray(servers)) {
              for (const server of servers) {
                await (intentorch as any).disconnectMCPServer?.(server.name);
              }
            }
          } catch (err) {
            // Ignore errors during cleanup
          }
        }

        // Ensure process exits
        setTimeout(() => {
          process.exit(0);
        }, 100);

      } catch (error: any) {
        console.error('❌ Workflow execution failed:', error.message);
        console.log('\n💡 Suggestions:');
        console.log('1. Make sure AI configuration is set:');
        console.log(`   ${PROGRAM_NAME} config set provider <openai|deepseek|...>`);
        console.log(`   ${PROGRAM_NAME} config set apiKey <your-api-key>`);
        console.log('2. Make sure required MCP Server is pulled and started:');
        console.log(`   ${PROGRAM_NAME} pull <server-name>`);
        console.log(`   ${PROGRAM_NAME} start <server-name>`);
        console.log('3. Or use --auto-start option');
        process.exit(1);
      }
    });

  return command;
}
