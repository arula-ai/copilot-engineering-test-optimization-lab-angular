export interface Payment {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: Currency;
  method: PaymentMethod;
  status: PaymentStatus;
  cardDetails?: CardDetails;
  transactionId?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CardDetails {
  number: string;
  expiry: string;
  cvv: string;
  holderName: string;
}

export interface ProcessPaymentDTO {
  orderId: string;
  userId: string;
  amount: number;
  currency: Currency;
  method: PaymentMethod;
  cardDetails?: CardDetails;
}

export interface RefundDTO {
  paymentId: string;
  amount: number;
  reason: string;
}

export interface PaymentResult {
  success: boolean;
  payment: Payment;
  message?: string;
}

export type PaymentMethod = 'credit_card' | 'debit_card' | 'bank_transfer' | 'wallet' | 'crypto';

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY';

export const SUPPORTED_CURRENCIES: Currency[] = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];

export const MIN_PAYMENT_AMOUNT = 0.01;
export const MAX_PAYMENT_AMOUNT = 1000000;
