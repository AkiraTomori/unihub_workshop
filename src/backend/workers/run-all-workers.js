import { spawn } from 'child_process';

const workers = [
  { name: 'ai-summary', script: 'workers/ai-summary-worker.js' },
  { name: 'csv-sync', script: 'workers/csv-sync-worker.js' },
  { name: 'notification', script: 'workers/notification-worker.js' },
  { name: 'outbox', script: 'workers/outbox-worker.js' },
];

const childProcesses = new Map();
let shuttingDown = false;

function startWorker({ name, script }) {
  const child = spawn(process.execPath, [script], {
    stdio: 'inherit',
    env: process.env,
  });

  childProcesses.set(name, child);

  child.on('exit', (code, signal) => {
    childProcesses.delete(name);

    if (shuttingDown) {
      return;
    }

    if (code !== 0) {
      console.error(`[Worker Launcher] ${name} exited with code ${code ?? 'null'} signal ${signal ?? 'null'}`);
      shutdown(1);
    }
  });

  child.on('error', (error) => {
    console.error(`[Worker Launcher] Failed to start ${name}:`, error.message);
    shutdown(1);
  });
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log('[Worker Launcher] Stopping all workers...');

  for (const child of childProcesses.values()) {
    child.kill('SIGINT');
  }

  setTimeout(() => process.exit(exitCode), 1000).unref();
}

for (const worker of workers) {
  startWorker(worker);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));