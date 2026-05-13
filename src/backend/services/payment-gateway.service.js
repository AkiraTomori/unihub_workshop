import { config } from '../config/config.js';

const DEFAULT_TIMEOUT_MS = 8000;
const RETRY_BASE_MS = config.payment.retryBaseMs;
const RETRY_DELAYS_MS = config.payment.retryDelaysMs;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitteredDelay(baseMs) {
  return baseMs + Math.floor(Math.random() * baseMs);
}

function isRetriableGatewayError(error) {
  return error?.retriable === true || error?.statusCode >= 500;
}

async function executeChargeAttempt({ amount, simulateResult, timeoutMs }) {
  const chargePromise = (async () => {
    await delay(50);

    if (simulateResult === 'timeout') {
      await delay(timeoutMs + 500);
      return { status: 'SUCCESS', transactionId: `VNPAY-${Date.now()}` };
    }

    if (simulateResult === '5xx' || simulateResult === 'server_error') {
      throw {
        code: 'GATEWAY_5XX',
        statusCode: 503,
        retriable: true,
        message: 'Payment provider temporarily unavailable',
      };
    }

    if (simulateResult === 'fail' || simulateResult === 'failure') {
      throw {
        code: 'GATEWAY_ERROR',
        statusCode: 400,
        retriable: false,
        message: 'Payment provider rejected the transaction',
      };
    }

    if (simulateResult === 'pending') {
      throw {
        code: 'GATEWAY_TIMEOUT',
        statusCode: 408,
        retriable: false,
        message: 'Payment gateway timeout',
      };
    }

    return {
      status: 'SUCCESS',
      transactionId: `VNPAY-${Date.now()}`,
      amount,
      provider: 'VNPAY',
    };
  })();

  const timeoutPromise = delay(timeoutMs).then(() => {
    throw {
      code: 'GATEWAY_TIMEOUT',
      statusCode: 408,
      retriable: false,
      message: 'Payment gateway timeout',
    };
  });

  return Promise.race([chargePromise, timeoutPromise]);
}

export class PaymentGatewayService {
  static async charge({ amount, simulateResult = 'success', timeoutMs = DEFAULT_TIMEOUT_MS }) {
    return executeChargeAttempt({ amount, simulateResult, timeoutMs });
  }

  static async chargeWithRetry({ amount, simulateResult = 'success', timeoutMs = DEFAULT_TIMEOUT_MS }) {
    let lastError;

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        return await executeChargeAttempt({ amount, simulateResult, timeoutMs });
      } catch (error) {
        lastError = error;

        if (!isRetriableGatewayError(error) || attempt >= RETRY_DELAYS_MS.length) {
          if (isRetriableGatewayError(error) && attempt >= RETRY_DELAYS_MS.length) {
            throw { ...error, retriableExhausted: true };
          }
          throw error;
        }

        const backoffMs = jitteredDelay(RETRY_DELAYS_MS[attempt] ?? RETRY_BASE_MS * (2 ** attempt));
        await delay(backoffMs);
      }
    }

    throw lastError;
  }
}

export default PaymentGatewayService;
