import * as SQLite from "expo-sqlite/legacy";

const DB_NAME = "unihub_checker.db";
const TABLE_NAME = "checkin_queue";

const db = SQLite.openDatabase(DB_NAME);

let initPromise = null;

function executeSql(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        sql,
        params,
        (_, result) => resolve(result),
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
}

function mapRow(row) {
  return {
    offlineSyncId: row.offline_sync_id,
    qrCode: row.qr_code,
    checkedInAt: row.checked_in_at,
    deviceId: row.device_id,
    status: row.status,
    syncAttempts: row.sync_attempts,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function initCheckinQueueStore() {
  if (!initPromise) {
    initPromise = (async () => {
      await executeSql(`
        CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
          offline_sync_id TEXT PRIMARY KEY NOT NULL,
          qr_code TEXT NOT NULL,
          checked_in_at TEXT NOT NULL,
          device_id TEXT NOT NULL,
          status TEXT NOT NULL,
          sync_attempts INTEGER NOT NULL DEFAULT 0,
          last_error TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      await executeSql(`CREATE INDEX IF NOT EXISTS idx_${TABLE_NAME}_status ON ${TABLE_NAME}(status);`);
      await executeSql(`CREATE INDEX IF NOT EXISTS idx_${TABLE_NAME}_updated_at ON ${TABLE_NAME}(updated_at);`);
    })();
  }

  return initPromise;
}

export function createOfflineSyncId() {
  return `offline-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export async function upsertQueuedCheckin({ offlineSyncId, qrCode, checkedInAt, deviceId = "mobile-checker" }) {
  await initCheckinQueueStore();
  const now = new Date().toISOString();
  const existing = await executeSql(
    `SELECT offline_sync_id, status FROM ${TABLE_NAME} WHERE qr_code = ? LIMIT 1;`,
    [qrCode]
  );

  if (existing.rows.length > 0) {
    const current = existing.rows.item(0);
    const shouldResync = String(current.status || "").toUpperCase() !== "SYNCED";

    await executeSql(
      `
        UPDATE ${TABLE_NAME}
        SET checked_in_at = ?,
            device_id = ?,
            status = ?,
            last_error = NULL,
            updated_at = ?
        WHERE qr_code = ?;
      `,
      [checkedInAt, deviceId, shouldResync ? "PENDING" : "SYNCED", now, qrCode]
    );

    return {
      offlineSyncId: current.offline_sync_id,
      qrCode,
      checkedInAt,
      deviceId,
      status: shouldResync ? "PENDING" : "SYNCED",
      wasDuplicate: true
    };
  }

  await executeSql(
    `
      INSERT INTO ${TABLE_NAME} (
        offline_sync_id,
        qr_code,
        checked_in_at,
        device_id,
        status,
        sync_attempts,
        last_error,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, 'PENDING', 0, NULL, ?, ?)
      ON CONFLICT(offline_sync_id) DO UPDATE SET
        qr_code = excluded.qr_code,
        checked_in_at = excluded.checked_in_at,
        device_id = excluded.device_id,
        status = 'PENDING',
        last_error = NULL,
        updated_at = excluded.updated_at;
    `,
    [offlineSyncId, qrCode, checkedInAt, deviceId, now, now]
  );

  return {
    offlineSyncId,
    qrCode,
    checkedInAt,
    deviceId,
    status: "PENDING",
    wasDuplicate: false
  };
}

export async function getQueuedCheckins({ statuses } = {}) {
  await initCheckinQueueStore();
  const params = [];
  const whereClause = Array.isArray(statuses) && statuses.length > 0
    ? `WHERE status IN (${statuses.map(() => "?").join(",")})`
    : "";

  if (Array.isArray(statuses) && statuses.length > 0) {
    params.push(...statuses);
  }

  const result = await executeSql(
    `SELECT * FROM ${TABLE_NAME} ${whereClause} ORDER BY datetime(updated_at) DESC;`,
    params
  );

  const rows = [];
  for (let index = 0; index < result.rows.length; index += 1) {
    rows.push(mapRow(result.rows.item(index)));
  }
  return rows;
}

export async function getPendingCheckins() {
  return getQueuedCheckins({ statuses: ["PENDING", "FAILED"] });
}

export async function markSyncResults(results = []) {
  await initCheckinQueueStore();
  const now = new Date().toISOString();

  for (const item of results) {
    if (!item?.offlineSyncId) continue;

    const normalizedStatus = String(item.status || "").toUpperCase();
    const isSynced = normalizedStatus === "SYNCED" || normalizedStatus === "DUPLICATE" || normalizedStatus === "UPDATED";
    const nextStatus = isSynced ? "SYNCED" : "FAILED";
    const nextError = isSynced ? null : item.status || item.message || "SYNC_FAILED";

    await executeSql(
      `
        UPDATE ${TABLE_NAME}
        SET status = ?,
            sync_attempts = sync_attempts + 1,
            last_error = ?,
            updated_at = ?
        WHERE offline_sync_id = ?;
      `,
      [nextStatus, nextError, now, item.offlineSyncId]
    );
  }
}

export async function markQueuedCheckinsFailed(items = [], errorMessage = "SYNC_FAILED") {
  await initCheckinQueueStore();
  const offlineIds = items
    .map((item) => item?.offlineSyncId)
    .filter(Boolean);

  const now = new Date().toISOString();
  for (const offlineSyncId of offlineIds) {
    await executeSql(
      `
        UPDATE ${TABLE_NAME}
        SET status = 'FAILED',
            sync_attempts = sync_attempts + 1,
            last_error = ?,
            updated_at = ?
        WHERE offline_sync_id = ?;
      `,
      [errorMessage, now, offlineSyncId]
    );
  }
}

export async function clearSyncedCheckins() {
  await initCheckinQueueStore();
  await executeSql(`DELETE FROM ${TABLE_NAME} WHERE status = 'SYNCED';`);
}
