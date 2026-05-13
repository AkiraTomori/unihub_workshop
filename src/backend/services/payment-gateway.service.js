const DEFAULT_TIMEOUT_MS = 8000;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class PaymentGatewayService {
  static async charge({ amount, simulateResult = 'success', timeoutMs = DEFAULT_TIMEOUT_MS }) {
    const chargePromise = (async () => {
      await delay(300);

      if (simulateResult === 'timeout') {
        await delay(timeoutMs + 500);
        return { status: 'SUCCESS', transactionId: `VNPAY-${Date.now()}` };
      }

      if (simulateResult === 'fail' || simulateResult === 'failure') {
        throw { code: 'GATEWAY_ERROR', message: 'Payment provider rejected the transaction' };
      }

      if (simulateResult === 'pending') {
        throw { code: 'GATEWAY_TIMEOUT', message: 'Payment gateway timeout' };
      }

      return {
        status: 'SUCCESS',
        transactionId: `VNPAY-${Date.now()}`,
        amount,
        provider: 'VNPAY',
      };
    })();

    const timeoutPromise = delay(timeoutMs).then(() => {
      throw { code: 'GATEWAY_TIMEOUT', message: 'Payment gateway timeout' };
    });

    return Promise.race([chargePromise, timeoutPromise]);
  }
}

export default PaymentGatewayService;
