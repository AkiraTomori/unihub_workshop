import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import CsvSync from '../models/csv-sync.model.js';
import db from '../config/db.js';
import { config } from '../config/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveCsvFilePath(inputPath) {
  const requestedPath = inputPath || './data/csv-sync/latest.csv';

  const candidates = path.isAbsolute(requestedPath)
    ? [requestedPath]
    : [
      path.resolve(process.cwd(), requestedPath),
      path.resolve(__dirname, '../../../', requestedPath),
      path.resolve(__dirname, '../../../', requestedPath.replace(/^\.\//, '')),
      ...(requestedPath === './data/csv-sync/latest.csv'
        ? [
            path.resolve(process.cwd(), './data/students.csv'),
            path.resolve(__dirname, '../../../data/students.csv'),
          ]
        : []),
    ];

  const resolvedPath = candidates.find((candidate) => fs.existsSync(candidate));

  if (!resolvedPath) {
    throw new Error(
      `File not found: ${requestedPath}. Tried: ${candidates.join(', ')}`
    );
  }

  return resolvedPath;
}

function getCsvSyncStoragePath(fileName = 'latest.csv') {
  return path.resolve(__dirname, '../data/csv-sync', fileName);
}

/**
 * Parse CSV line by line
 * Supports both \r\n and \n line endings
 */
async function* parseCSVStream(stream) {
  let buffer = '';

  for await (const chunk of stream) {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop(); // Keep incomplete line

    for (const line of lines) {
      if (line.trim()) {
        yield line;
      }
    }
  }

  if (buffer.trim()) {
    yield buffer;
  }
}

/**
 * Parse CSV line into object
 * Expected columns: student_code, email, full_name
 */
function parseCSVLine(line, headers) {
  const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
  const record = {};

  headers.forEach((header, index) => {
    record[header] = values[index] || '';
  });

  return record;
}

/**
 * Validate student record
 */
function validateRecord(record) {
  const errors = [];

  if (!record.student_code || !record.student_code.trim()) {
    errors.push('student_code is required');
  }

  if (!record.email || !record.email.trim()) {
    errors.push('email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) {
    errors.push('email format is invalid');
  }

  if (!record.full_name || !record.full_name.trim()) {
    errors.push('full_name is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function parseErrorDetailsField(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return null;
}

export class CsvSyncService {
  /**
   * Trigger CSV sync from file
   */
  static async runSync(filePath) {
    let logId = null;

    try {
      const resolvedCsvPath = resolveCsvFilePath(filePath);

      // Generate log entry
      const fileName = path.basename(resolvedCsvPath);
      const log = await CsvSync.createLog(fileName);
      logId = log.id;

      // Mark as started
      await CsvSync.updateLogStatus(logId, 'PROCESSING');

      // Read file stream
      const stream = fs.createReadStream(resolvedCsvPath, { encoding: 'utf-8' });
      const stats = {
        totalRows: 0,
        successRows: 0,
        errors: [],
        batchSize: 100,
      };

      let rowIndex = 0;
      let headers = null;
      let batch = [];

      // Process CSV stream
      for await (const line of parseCSVStream(stream)) {
        // Parse header
        if (rowIndex === 0) {
          headers = line.split(',').map(h => h.trim().toLowerCase());
          rowIndex++;
          continue;
        }

        stats.totalRows++;
        rowIndex++;

        // Parse and validate record
        const record = parseCSVLine(line, headers);
        const validation = validateRecord(record);

        if (!validation.isValid) {
          stats.errors.push({
            row: stats.totalRows,
            student_code: record.student_code || 'N/A',
            errors: validation.errors,
          });
          continue;
        }

        // Add to batch
        batch.push({
          student_code: record.student_code.trim(),
          email: record.email.trim().toLowerCase(),
          full_name: record.full_name.trim(),
          source_row: stats.totalRows,
        });

        // Batch upsert when batch is full or at end of stream
        if (batch.length >= stats.batchSize) {
          const batchResult = await CsvSyncService.batchUpsertUsers(batch);
          stats.successRows += batchResult.successCount;
          stats.errors.push(...batchResult.errors);
          batch = [];
        }
      }

      // Handle remaining batch
      if (batch.length > 0) {
        const batchResult = await CsvSyncService.batchUpsertUsers(batch);
        stats.successRows += batchResult.successCount;
        stats.errors.push(...batchResult.errors);
      }

      // Calculate error count
      const errorCount = stats.totalRows - stats.successRows;

      // Update log with final stats
      await CsvSync.updateLogProgress(
        logId,
        stats.totalRows,
        stats.successRows,
        stats.errors.length > 0 ? stats.errors : null
      );

      // Mark as completed
      await CsvSync.markCompleted(logId);

      return {
        status: 'SUCCESS',
        message: `CSV import completed. ${stats.successRows}/${stats.totalRows} rows imported.`,
        data: {
          logId,
          totalRows: stats.totalRows,
          successRows: stats.successRows,
          errorRows: errorCount,
          errorCount: stats.errors.length,
        },
      };
    } catch (error) {
      if (logId) {
        await CsvSync.markFailed(logId, {
          error: error.message,
          stack: error.stack,
        });
      }

      throw error;
    }
  }

  static getLatestCsvStoragePath() {
    return getCsvSyncStoragePath('latest.csv');
  }

  static async saveUploadedCsvFile(fileBuffer, originalFileName) {
    if (!fileBuffer) {
      throw new Error('CSV file buffer is required');
    }

    if (!originalFileName || !originalFileName.toLowerCase().endsWith('.csv')) {
      throw new Error('Only CSV files are allowed');
    }

    const storageDir = path.dirname(this.getLatestCsvStoragePath());
    await fs.promises.mkdir(storageDir, { recursive: true });
    await fs.promises.writeFile(this.getLatestCsvStoragePath(), fileBuffer);

    return {
      fileName: originalFileName,
      storedPath: this.getLatestCsvStoragePath(),
      size: fileBuffer.length,
    };
  }

  /**
   * Batch upsert users into database
   */
  static async batchUpsertUsers(records) {
    const result = {
      successCount: 0,
      errors: [],
    };

    await db.transaction(async (trx) => {
      const defaultPasswordHash = await bcrypt.hash('123456789', config.bcrypt.rounds);

      for (const record of records) {
        try {
          const studentMatch = await trx('users')
            .where('student_code', record.student_code)
            .first('id');

          const emailMatch = await trx('users')
            .where('email', record.email)
            .first('id');

          if (studentMatch && emailMatch && studentMatch.id !== emailMatch.id) {
            throw new Error('student_code and email match different existing users');
          }

          const targetUserId = studentMatch?.id || emailMatch?.id;

          if (targetUserId) {
            await trx('users')
              .where('id', targetUserId)
              .update({
                student_code: record.student_code,
                email: record.email,
                full_name: record.full_name,
                password_hash: defaultPasswordHash,
                role: 'STUDENT',
                is_active: true,
                last_synced_at: trx.fn.now(),
                updated_at: trx.fn.now(),
              });
          } else {
            await trx('users').insert({
              student_code: record.student_code,
              email: record.email,
              full_name: record.full_name,
              password_hash: defaultPasswordHash,
              role: 'STUDENT',
              is_active: true,
              last_synced_at: trx.fn.now(),
            });
          }

          result.successCount += 1;
        } catch (error) {
          result.errors.push({
            row: record.source_row,
            student_code: record.student_code || 'N/A',
            errors: [error.message],
          });
        }
      }
    });

    return result;
  }

  /**
   * Get CSV sync log
   */
  static async getLog(logId) {
    const log = await CsvSync.getLogById(logId);
    if (!log) {
      throw new Error('Log not found');
    }

    return {
      ...log,
      error_details: parseErrorDetailsField(log.error_details),
    };
  }

  /**
   * Get all CSV sync logs
   */
  static async getAllLogs(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const { logs, total } = await CsvSync.getAllLogs(limit, offset);

    return {
      logs: logs.map(log => ({
        ...log,
        error_details: parseErrorDetailsField(log.error_details),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get latest CSV sync log
   */
  static async getLatestLog() {
    const log = await CsvSync.getLatestLog();
    if (!log) {
      return null;
    }

    return {
      ...log,
      error_details: parseErrorDetailsField(log.error_details),
    };
  }
}

export default CsvSyncService;
