import pdfParse from 'pdf-parse';
import fetch from 'node-fetch';
import Admin from '../models/admin.model.js';
import { consumeQueue, createQueue, closeRabbitMQ } from '../config/rabbitmq.js';
import { generateSummary, validateText } from '../config/vertex-ai.js';
import { config } from '../config/config.js';
import db from '../config/db.js';

const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50MB
const PDF_EXTRACT_TIMEOUT = 30 * 1000; // 30 seconds
const MAX_SUMMARY_LENGTH = config.worker.maxSummaryLength;
const QUEUE_NAME = 'ai_summary_jobs';
const ROUTING_KEY = 'document.uploaded';

// Debug flag: enable verbose worker logs when WORKER_DEBUG=true
const DEBUG = config.worker.debug || config.nodeEnv !== 'production';
function debugLog(...args) {
  if (DEBUG) console.log('[Worker][DEBUG]', ...args);
}

/**
 * Download PDF from URL
 */
async function downloadPDF(pdfUrl) {
  debugLog('downloadPDF called with url:', pdfUrl);
  console.log(`[Worker] Downloading PDF from: ${pdfUrl}`);

  try {
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const buffer = await response.buffer();

    if (buffer.length > MAX_PDF_SIZE) {
      throw new Error(`PDF size ${buffer.length} exceeds limit ${MAX_PDF_SIZE}`);
    }

    debugLog('downloadPDF completed, size:', buffer.length);
    console.log(`[Worker] PDF downloaded: ${buffer.length} bytes`);
    return buffer;
  } catch (error) {
    console.error('[Worker] downloadPDF error:', error);
    throw new Error(`Failed to download PDF: ${error.message}`);
  }
}

/**
 * Extract text from PDF buffer with timeout
 */
async function extractTextFromPDF(buffer) {
  debugLog('extractTextFromPDF called, buffer length:', buffer && buffer.length);
  console.log('[Worker] Extracting text from PDF...');

  try {
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('PDF extraction timeout')), PDF_EXTRACT_TIMEOUT)
    );

    // Race between extraction and timeout
    const data = await Promise.race([pdfParse(buffer), timeoutPromise]);

    const text = data.text || '';
    if (!text || text.trim().length === 0) {
      throw new Error('PDF contains no extractable text');
    }

    debugLog('raw extracted text length:', text.length);
    console.log(`[Worker] Text extracted: ${text.length} characters`);

    // Clean up text (remove extra whitespace, normalize line breaks)
    const cleanedText = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join('\n');

    return cleanedText;
  } catch (error) {
    console.error('[Worker] extractTextFromPDF error:', error);
    throw new Error(`Failed to extract text: ${error.message}`);
  }
}

/**
 * Process document with retry logic
 */
async function processDocumentWithRetry(event, maxRetries = 3) {
  const { workshopId, documentId, pdfUrl } = event;
  let attempt = 0;
  let lastError = null;

  debugLog('processDocumentWithRetry called for', { workshopId, documentId, pdfUrl });

  while (attempt < maxRetries) {
    attempt += 1;
    console.log(`[Worker] Processing document ${documentId}: attempt ${attempt}/${maxRetries}`);

    try {
      // Step 1: Mark as PROCESSING
      debugLog('updating DB status -> PROCESSING for', documentId);
      await Admin.updateDocumentStatus(documentId, 'PROCESSING');
      console.log('[Worker] Status updated to PROCESSING');

      // Step 2: Download PDF
      const pdfBuffer = await downloadPDF(pdfUrl);

      // Step 3: Extract text
      debugLog('calling extractTextFromPDF for', documentId);
      const extractedText = await extractTextFromPDF(pdfBuffer);
      debugLog('extractedText length', extractedText && extractedText.length);
      validateText(extractedText);

      // Step 4: Generate summary
      debugLog('calling generateSummary, input length:', extractedText.length, 'maxLength:', MAX_SUMMARY_LENGTH);
      const summary = await generateSummary(extractedText, MAX_SUMMARY_LENGTH);
      debugLog('generateSummary returned length:', summary && summary.length);
      validateText(summary);

      // Step 5: Save to database
      debugLog('saving summary to DB for', documentId, 'summary length:', summary && summary.length);
      await Admin.updateDocumentStatus(documentId, 'COMPLETED', summary);
      console.log(`[Worker] Document processed successfully. Summary: ${summary.substring(0, 100)}...`);

      return { success: true, summary };
    } catch (error) {
      lastError = error;
      console.error(`[Worker] Processing failed (attempt ${attempt}):`, error);

      if (attempt < maxRetries) {
        // Exponential backoff: 2s, 4s, 8s
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`[Worker] Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // All retries exhausted
  console.error(`[Worker] Failed after ${maxRetries} attempts`, lastError);
  await Admin.updateDocumentStatus(documentId, 'FAILED', `Error: ${lastError.message}`);
  throw lastError;
}

/**
 * Main message handler
 */
async function handleDocumentUploadedEvent(event) {
  const { workshopId, documentId, pdfUrl } = event;

  debugLog('handleDocumentUploadedEvent called with event:', event);
  console.log(`[Worker] Processing event:`, { workshopId, documentId, pdfUrl });

  try {
    await processDocumentWithRetry(event);
  } catch (error) {
    console.error('[Worker] Event handler failed:', error);
  }
}

/**
 * Start AI Worker
 */
async function startWorker() {
  debugLog('startWorker initializing');
  console.log('[Worker] Starting AI Summary Worker...');

  try {
    // Create queue
    const queueName = await createQueue(QUEUE_NAME, ROUTING_KEY);
    console.log(`[Worker] Queue ready: ${queueName}`);

    // Start consuming
    await consumeQueue(QUEUE_NAME, handleDocumentUploadedEvent);

    console.log('[Worker] AI Summary Worker started successfully');
  } catch (error) {
    console.error('[Worker] Failed to start:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function shutdown(signal) {
  debugLog('shutdown invoked with signal:', signal);
  console.log(`[Worker] Received ${signal}, shutting down gracefully...`);
  try {
    await closeRabbitMQ();
    await db.destroy();
    console.log('[Worker] Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('[Worker] Shutdown error:', error);
    process.exit(1);
  }
}

// Start worker if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startWorker();

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Keep process alive
  process.on('exit', (code) => {
    console.log(`[Worker] Exiting with code ${code}`);
  });
}

export { startWorker, handleDocumentUploadedEvent, processDocumentWithRetry };
