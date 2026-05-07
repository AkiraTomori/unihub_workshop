import db from '../config/db.js';

export class CsvSync {
  static toJsonColumnValue(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  }

  static resolveReturningId(returningValue) {
    if (returningValue && typeof returningValue === 'object') {
      return returningValue.id;
    }
    return returningValue;
  }

  /**
   * Create a new CSV sync log entry
   */
  static async createLog(fileName) {
    const [inserted] = await db('csv_sync_logs').insert({
      file_name: fileName,
      status: 'PROCESSING',
      total_rows: 0,
      success_rows: 0,
    }).returning('id');

    const id = this.resolveReturningId(inserted);

    return this.getLogById(id);
  }

  /**
   * Get log by ID
   */
  static async getLogById(id) {
    return db('csv_sync_logs').where('id', id).first();
  }

  /**
   * Get latest log
   */
  static async getLatestLog() {
    return db('csv_sync_logs').orderBy('created_at', 'desc').first();
  }

  /**
   * Get all logs with pagination
   */
  static async getAllLogs(limit = 20, offset = 0) {
    const logs = await db('csv_sync_logs')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db('csv_sync_logs').count('* as count');

    return { logs, total: parseInt(count) };
  }

  /**
   * Update log status
   */
  static async updateLogStatus(id, status, updates = {}) {
    await db('csv_sync_logs').where('id', id).update({
      status,
      ...updates,
      updated_at: db.fn.now(),
    });

    return this.getLogById(id);
  }

  /**
   * Update log progress
   */
  static async updateLogProgress(id, totalRows, successRows, errorDetails = null) {
    await db('csv_sync_logs').where('id', id).update({
      total_rows: totalRows,
      success_rows: successRows,
      error_details: this.toJsonColumnValue(errorDetails),
      updated_at: db.fn.now(),
    });

    return this.getLogById(id);
  }

  /**
   * Mark log as completed
   */
  static async markCompleted(id) {
    return this.updateLogStatus(id, 'SUCCESS');
  }

  /**
   * Mark log as failed
   */
  static async markFailed(id, errorDetails) {
    return this.updateLogStatus(id, 'FAILED', {
      error_details: this.toJsonColumnValue(errorDetails),
    });
  }
}

export default CsvSync;
