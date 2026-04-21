import { Command } from 'commander';
import { getProcessManager, DaemonClient, PROGRAM_NAME } from '@intentorch/core';

export function stopCommand(): Command {
  const command = new Command('stop')
    .description('Stop a running MCP Server')
    .argument('<target>', 'Process ID or Server name (e.g., 1234 or Joooook/12306-mcp)')
    .option('--no-daemon', 'Force local mode even if daemon is running')
    .action(async (target: string, options) => {
      try {
        const useDaemon = options.daemon;
        let pid: number;
        let serverName: string | undefined;

        // Try to parse as PID
        const parsedPid = parseInt(target, 10);
        if (!isNaN(parsedPid) && parsedPid.toString() === target) {
          pid = parsedPid;
        } else {
          // It's a server name, find the PID
          serverName = target;
          const processManager = getProcessManager();
          const runningServers = await processManager.listRunning();
          const server = runningServers.find(s => s.serverName === serverName);
          
          if (!server) {
            console.error(`✗ MCP Server "${serverName}" is not running.`);
            process.exit(1);
          }
          pid = server.pid;
        }

        if (!useDaemon) {
          // User explicitly requested no daemon, use local mode
          const processManager = getProcessManager();
          await processManager.stop(pid);
          console.log(`✓ Process ${pid} ${serverName ? `(${serverName}) ` : ''}stopped in local mode`);
          console.log(`⚠️  Note: Process was not managed by daemon`);
          return;
        }
        
        // Try daemon mode
        try {
          const client = new DaemonClient();
          const isDaemonRunning = await client.isDaemonRunning();
          if (!isDaemonRunning) {
            throw new Error('Daemon is not running');
          }
          
          const response = await client.stopServer(pid);
          console.log(`✓ ${response.message}${serverName ? ` (${serverName})` : ''}`);
        } catch (daemonError) {
          console.error('❌ Daemon mode failed:', (daemonError as Error).message);
          console.error('\n💡 Please start the daemon first:');
          console.error(`   ${PROGRAM_NAME} daemon start`);
          console.error('\nOr use --no-daemon flag to force local mode.');
          throw new Error(`Daemon is not running. Please run "${PROGRAM_NAME} daemon start" first.`);
        }
      } catch (error) {
        console.error(`✗ Failed to stop "${target}":`, (error as Error).message);
        process.exit(1);
      }
    });

  return command;
}
