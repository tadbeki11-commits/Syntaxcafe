import type { Container } from '@/bootstrap/container';
import { TOKENS } from '@/bootstrap/container';
import { paymentsAdapter } from '@/infrastructure/adapters/payments.adapter';
import { PaymentFacade } from '@/application/payments/payment.facade';

export const registerPaymentModule = (container: Container): void => {
  container.registerSingleton(TOKENS.paymentFacade, new PaymentFacade(paymentsAdapter));
};
