import CsvSyncService from '../services/csv-sync.service.js';
import db from '../config/db.js';
import { config } from '../config/config.js';

// Schedule time (2:00 AM every day)
const SCHEDULED_HOUR = 2;
const SCHEDULED_MINUTE = 0;

function getNextRunTime() {
  const now = new Date();
  const next = new Date();
  next.setHours(SCHEDULED_HOUR, SCHEDULED_MINUTE, 0, 0);

  // If the scheduled time has already passed today, schedule for tomorrow
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

function getTimeUntilNextRun(nextRun) {
  const now = new Date();
  return nextRun.getTime() - now.getTime();
}

async function runCsvSync() {
  const csvPath = config.csvSync.filePath || CsvSyncService.getLatestCsvStoragePath();

  try {
    console.log(`[CSV Sync Worker] Starting sync from ${csvPath}`);
    const result = await CsvSyncService.runSync(csvPath);
    console.log(`[CSV Sync Worker] Sync completed:`, result);
  } catch (error) {
    console.error(`[CSV Sync Worker] Sync failed:`, error.message);
  }
}

async function scheduleNextRun() {
  const nextRun = getNextRunTime();
  const timeUntilRun = getTimeUntilNextRun(nextRun);

  console.log(`[CSV Sync Worker] Next run scheduled for ${nextRun.toLocaleString()}`);
  console.log(`[CSV Sync Worker] Time until next run: ${Math.round(timeUntilRun / 1000 / 60)} minutes`);

  setTimeout(async () => {
    await runCsvSync();
    await scheduleNextRun();
  }, timeUntilRun);
}

async function start() {
  console.log('CSV Sync Worker started');
  console.log(`Scheduled time: ${SCHEDULED_HOUR.toString().padStart(2, '0')}:${SCHEDULED_MINUTE.toString().padStart(2, '0')} every day`);

  // Run immediately on startup if it's testing/debugging
  if (config.csvSync.runOnStartup) {
    console.log('[CSV Sync Worker] Running sync on startup (RUN_ON_STARTUP=true)');
    await runCsvSync();
  }

  // Schedule next run
  await scheduleNextRun();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('[CSV Sync Worker] Shutting down gracefully...');
    await db.destroy();
    process.exit(0);
  });
}

start().catch((error) => {
  console.error('Failed to start CSV Sync Worker:', error);
  process.exit(1);
});
