import { DaemonClient } from '../daemon/client';
import { ProcessInfo } from '../process-manager/types';
import { PROGRAM_NAME } from './constants';

export async function shouldUseDaemonMode(): Promise<boolean> {
  try {
    // Check if daemon is running
    const client = new DaemonClient();
    return await client.isDaemonRunning();
  } catch (error) {
    return false;
  }
}

export async function withDaemonFallback<T = any>(
  daemonOperation: () => Promise<T>,
  _localOperation: () => Promise<T>
): Promise<T> {
  try {
    if (await shouldUseDaemonMode()) {
      return await daemonOperation();
    }
  } catch (error) {
    console.error('❌ Daemon mode failed:', (error as Error).message);
    console.error('\n💡 Please start the daemon first:');
    console.error(`   ${PROGRAM_NAME} daemon start`);
    console.error('\nOr use --no-daemon flag to force local mode.');
    throw new Error(`Daemon is not running. Please run "${PROGRAM_NAME} daemon start" first.`);
  }
  
  // If daemon is not running, we should not fallback to local mode
  console.error('❌ Daemon is not running.');
  console.error('\n💡 Please start the daemon first:');
  console.error(`   ${PROGRAM_NAME} daemon start`);
  console.error('\nOr use --no-daemon flag to force local mode.');
  throw new Error(`Daemon is not running. Please run "${PROGRAM_NAME} daemon start" first.`);
}

// Specialized version for ProcessInfo arrays
export async function withDaemonFallbackForProcesses(
  daemonOperation: () => Promise<ProcessInfo[]>,
  localOperation: () => Promise<ProcessInfo[]>
): Promise<ProcessInfo[]> {
  return withDaemonFallback(daemonOperation, localOperation);
}
