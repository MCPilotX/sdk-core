import { DaemonServer } from '../dist/src/daemon/server.js';
const daemon = new DaemonServer({ host: 'localhost', port: 9658 });
console.log('Starting custom daemon runner...');
daemon.start().then(() => console.log('Daemon started on port 9658'));
