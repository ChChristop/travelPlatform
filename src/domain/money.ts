import type { PaymentMethodId, UserId } from './ids';

export interface Money {
  amount: number;
  currency: string;
}

export interface PaymentInfo {
  status: 'unpaid' | 'paid' | 'refunded';
  paidAt?: string;
  methodId?: PaymentMethodId;
  payerId?: UserId;
}