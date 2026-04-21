import { Command } from 'commander';
import { DaemonServer, DaemonClient } from '@intentorch/core';
import { spawn } from 'child_process';

export function daemonCommand(): Command {
  const command = new Command('daemon')
    .description('Manage InTorch daemon process')
    .addCommand(createStartCommand())
    .addCommand(createStopCommand())
    .addCommand(createStatusCommand())
    .addCommand(createRestartCommand());

  return command;
}

function createStartCommand(): Command {
  return new Command('start')
    .description('Start the InTorch daemon')
    .option('-h, --host <host>', 'Host to bind to (default: localhost)', 'localhost')
    .option('-p, --port <port>', 'Port to listen on (default: 9658)', '9658')
    .option('-d, --detached', 'Run as detached background process', false)
    .action(async (options) => {
      try {
        const client = new DaemonClient(options.host, parseInt(options.port));
        
        // Check if daemon is already running
        if (await client.isDaemonRunning()) {
          console.log('✓ Daemon is already running');
          return;
        }

        if (options.detached) {
          // Start as detached background process
          // Use the same script that was invoked (process.argv[1])
          const scriptPath = process.argv[1];
          const child = spawn(process.execPath, [scriptPath, 'daemon', 'start', '--host', options.host, '--port', options.port], {
            detached: true,
            stdio: ['ignore', 'pipe', 'pipe'], // Capture stderr for debugging
            env: { ...process.env, ORCHAPP_DAEMON: 'true' }
          });
          
          // Collect error output for debugging
          let errorOutput = '';
          child.stderr?.on('data', (data) => {
            errorOutput += data.toString();
          });
          
          child.unref();
          
          // Wait longer for daemon to start (background processes need more time)
          console.log('Starting daemon in background...');
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Check if daemon is actually running
          const checkClient = new DaemonClient(options.host, parseInt(options.port));
          let isRunning = false;
          let retries = 3;
          
          while (retries > 0 && !isRunning) {
            isRunning = await checkClient.isDaemonRunning().catch(() => false);
            if (!isRunning) {
              retries--;
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
          
          if (isRunning) {
            console.log('✓ Daemon started in background');
            console.log(`  PID: ${child.pid}`);
            console.log(`  URL: http://${options.host}:${options.port}`);
          } else {
            console.error('✗ Daemon failed to start in background');
            if (errorOutput) {
              console.error('  Error output:', errorOutput.trim());
            }
            console.error('  The process may have exited.');
            console.error('  Try running in foreground to see error messages:');
            console.error(`  intorch daemon start --host ${options.host} --port ${options.port}`);
            process.exit(1);
          }
        } else {
          // Start in foreground
          const daemon = new DaemonServer({
            host: options.host,
            port: parseInt(options.port),
          });
          
          console.log('Starting InTorch daemon...');
          console.log(`  Host: ${options.host}`);
          console.log(`  Port: ${options.port}`);
          console.log('Press Ctrl+C to stop');
          
          await daemon.start();
          
          // Keep process alive
          process.on('SIGINT', async () => {
            console.log('\nStopping daemon...');
            await daemon.stop();
            process.exit(0);
          });
          
          process.on('SIGTERM', async () => {
            await daemon.stop();
            process.exit(0);
          });
        }
      } catch (error) {
        console.error('✗ Failed to start daemon:', (error as Error).message);
        process.exit(1);
      }
    });
}

function createStopCommand(): Command {
  return new Command('stop')
    .description('Stop the InTorch daemon')
    .action(async () => {
      try {
        const client = new DaemonClient();
        
        // Check if daemon is running via HTTP
        if (await client.isDaemonRunning()) {
          // Try to stop gracefully via HTTP
          try {
            const status = await client.getStatus();
            console.log(`Stopping daemon (PID: ${status.pid})...`);
            
            // Send SIGTERM to daemon process
            if (status.pid) {
              process.kill(status.pid, 'SIGTERM');
              
              // Wait for process to stop
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Check if still running
              try {
                process.kill(status.pid, 0);
                // Still running, send SIGKILL
                process.kill(status.pid, 'SIGKILL');
                console.log('✓ Daemon stopped (forcefully)');
              } catch (error) {
                console.log('✓ Daemon stopped gracefully');
              }
            }
          } catch (error) {
            console.error('Failed to stop via HTTP, trying direct process...');
          }
        }
        
        // Also check if daemon process is running via PID file
        const pid = await DaemonClient.getDaemonPid();
        if (pid && await DaemonClient.isDaemonProcessRunning()) {
          console.log(`Stopping daemon process (PID: ${pid})...`);
          try {
            process.kill(pid, 'SIGTERM');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check if still running
            try {
              process.kill(pid, 0);
              process.kill(pid, 'SIGKILL');
              console.log('✓ Daemon stopped (forcefully)');
            } catch (error) {
              console.log('✓ Daemon stopped gracefully');
            }
          } catch (error) {
            console.error('Failed to stop daemon process:', (error as Error).message);
          }
        } else {
          console.log('✓ Daemon is not running');
        }
      } catch (error) {
        console.error('✗ Failed to stop daemon:', (error as Error).message);
        process.exit(1);
      }
    });
}

function createStatusCommand(): Command {
  return new Command('status')
    .description('Check daemon status')
    .action(async () => {
      try {
        const client = new DaemonClient();
        
        // Check via HTTP
        if (await client.isDaemonRunning()) {
          const status = await client.getStatus();
          console.log('=== DAEMON STATUS ===');
          console.log(`Status: ✅ Running`);
          console.log(`PID: ${status.pid}`);
          console.log(`URL: http://${status.config.host}:${status.config.port}`);
          console.log(`Uptime: ${Math.floor(status.uptime! / 1000)} seconds`);
          console.log(`Host: ${status.config.host}`);
          console.log(`Port: ${status.config.port}`);
        } else {
          // Check via PID file
          const pid = await DaemonClient.getDaemonPid();
          const isRunning = await DaemonClient.isDaemonProcessRunning();
          
          console.log('=== DAEMON STATUS ===');
          if (isRunning && pid) {
            console.log(`Status: ⚠️  Process running but HTTP not responding`);
            console.log(`PID: ${pid}`);
            console.log(`Note: Daemon process exists but HTTP server may not be accessible`);
          } else {
            console.log(`Status: ❌ Stopped`);
            console.log(`Daemon is not running`);
          }
        }
      } catch (error) {
        console.error('✗ Failed to check daemon status:', (error as Error).message);
        process.exit(1);
      }
    });
}

function createRestartCommand(): Command {
  return new Command('restart')
    .description('Restart the InTorch daemon')
    .allowExcessArguments(true)
    .action(async () => {
      try {
        // Create a simple stop function
        const stopDaemon = async () => {
          try {
            const client = new DaemonClient();
            
            // Check if daemon is running via HTTP
            if (await client.isDaemonRunning()) {
              // Try to stop gracefully via HTTP
              try {
                const status = await client.getStatus();
                console.log(`Stopping daemon (PID: ${status.pid})...`);
                
                // Send SIGTERM to daemon process
                if (status.pid) {
                  process.kill(status.pid, 'SIGTERM');
                  
                  // Wait for process to stop
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  
                  // Check if still running
                  try {
                    process.kill(status.pid, 0);
                    // Still running, send SIGKILL
                    process.kill(status.pid, 'SIGKILL');
                    console.log('✓ Daemon stopped (forcefully)');
                  } catch (error) {
                    console.log('✓ Daemon stopped gracefully');
                  }
                }
              } catch (error) {
                console.error('Failed to stop via HTTP, trying direct process...');
              }
            }
            
            // Also check if daemon process is running via PID file
            const pid = await DaemonClient.getDaemonPid();
            if (pid && await DaemonClient.isDaemonProcessRunning()) {
              console.log(`Stopping daemon process (PID: ${pid})...`);
              try {
                process.kill(pid, 'SIGTERM');
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Check if still running
                try {
                  process.kill(pid, 0);
                  process.kill(pid, 'SIGKILL');
                  console.log('✓ Daemon stopped (forcefully)');
                } catch (error) {
                  console.log('✓ Daemon stopped gracefully');
                }
              } catch (error) {
                console.error('Failed to stop daemon process:', (error as Error).message);
              }
            } else {
              console.log('✓ Daemon is not running');
            }
          } catch (error) {
            console.error('✗ Failed to stop daemon:', (error as Error).message);
            throw error;
          }
        };
        
        // Create a simple start function
        const startDaemon = async () => {
          try {
            const options = { host: 'localhost', port: '9658', detached: true };
            const client = new DaemonClient(options.host, parseInt(options.port));
            
            // Check if daemon is already running
            if (await client.isDaemonRunning()) {
              console.log('✓ Daemon is already running');
              return;
            }

            // Start as detached background process
            // Use the same script that was invoked (process.argv[1])
            const scriptPath = process.argv[1];
            const child = spawn(process.execPath, [scriptPath, 'daemon', 'start', '--host', options.host, '--port', options.port], {
              detached: true,
              stdio: ['ignore', 'pipe', 'pipe'], // Capture stderr for debugging
              env: { ...process.env, ORCHAPP_DAEMON: 'true' }
            });
            
            // Collect error output for debugging
            let errorOutput = '';
            child.stderr?.on('data', (data) => {
              errorOutput += data.toString();
            });
            
            child.unref();
            
            // Wait longer for daemon to start (background processes need more time)
            console.log('Starting daemon in background...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Check if daemon is actually running
            const checkClient = new DaemonClient(options.host, parseInt(options.port));
            let isRunning = false;
            let retries = 3;
            
            while (retries > 0 && !isRunning) {
              isRunning = await checkClient.isDaemonRunning().catch(() => false);
              if (!isRunning) {
                retries--;
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
            
            if (isRunning) {
              console.log('✓ Daemon started in background');
              console.log(`  PID: ${child.pid}`);
              console.log(`  URL: http://${options.host}:${options.port}`);
            } else {
              console.error('✗ Daemon failed to start in background');
              if (errorOutput) {
                console.error('  Error output:', errorOutput.trim());
              }
              console.error('  The process may have exited.');
              console.error('  Try running in foreground to see error messages:');
              console.error(`  intorch daemon start --host ${options.host} --port ${options.port}`);
              throw new Error('Daemon failed to start');
            }
          } catch (error) {
            console.error('✗ Failed to start daemon:', (error as Error).message);
            throw error;
          }
        };
        
        // Stop daemon
        await stopDaemon();
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Start daemon
        await startDaemon();
        
        console.log('✓ Daemon restarted');
      } catch (error) {
        console.error('✗ Failed to restart daemon:', (error as Error).message);
        process.exit(1);
      }
    });
}
