import type { Order, PaymentStatus } from '../types';
import type { PaymentMethod, PaymentMethodId, PaymentProvider, PaymentResult } from './contracts';

const METHODS: PaymentMethod[] = [
  { id: 'card', label: 'Debit Or Credit Card', description: 'Visa and Mastercard' },
  { id: 'instant_eft', label: 'Instant EFT', description: 'Pay securely from your bank' },
];

/**
 * Placeholder used until a real provider is integrated. It never reports success: every order
 * stays "awaiting payment" until a real provider (or the backend) confirms it.
 */
export class NotConfiguredPaymentProvider implements PaymentProvider {
  readonly id = 'none';
  readonly displayName = 'Not Connected';
  readonly isConfigured = false;

  availableMethods(): PaymentMethod[] {
    return METHODS;
  }

  async startPayment(_order: Order, _method: PaymentMethodId): Promise<PaymentResult> {
    return { state: 'not_configured' };
  }

  async getPaymentStatus(order: Order): Promise<PaymentStatus> {
    return order.paymentStatus;
  }
}
