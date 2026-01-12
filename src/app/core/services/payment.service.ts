import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, delay, map, catchError, tap } from 'rxjs';
import {
  Payment,
  ProcessPaymentDTO,
  RefundDTO,
  PaymentResult,
  PaymentStatus,
  CardDetails,
  SUPPORTED_CURRENCIES,
  MIN_PAYMENT_AMOUNT,
  MAX_PAYMENT_AMOUNT,
  Currency
} from '../models/payment.model';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private readonly apiUrl = '/api/payments';

  // Signal-based state for Angular 19
  private paymentsSignal = signal<Payment[]>([]);
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);

  // Computed signals
  public readonly payments = computed(() => this.paymentsSignal());
  public readonly isLoading = computed(() => this.loadingSignal());
  public readonly error = computed(() => this.errorSignal());
  public readonly completedPayments = computed(() =>
    this.paymentsSignal().filter(p => p.status === 'completed')
  );
  public readonly totalRevenue = computed(() =>
    this.completedPayments().reduce((sum, p) => sum + p.amount, 0)
  );

  private readonly http = inject(HttpClient);

  /**
   * Process a payment with full validation
   */
  processPayment(dto: ProcessPaymentDTO): Observable<PaymentResult> {
    // Validate amount
    if (dto.amount < MIN_PAYMENT_AMOUNT) {
      return throwError(() => new Error(`Amount must be at least ${MIN_PAYMENT_AMOUNT}`));
    }

    if (dto.amount > MAX_PAYMENT_AMOUNT) {
      return throwError(() => new Error(`Amount cannot exceed ${MAX_PAYMENT_AMOUNT}`));
    }

    // Validate currency
    if (!SUPPORTED_CURRENCIES.includes(dto.currency)) {
      return throwError(() => new Error(`Unsupported currency: ${dto.currency}`));
    }

    // Validate card details for card payments
    if ((dto.method === 'credit_card' || dto.method === 'debit_card') && dto.cardDetails) {
      const cardValidation = this.validateCardDetails(dto.cardDetails);
      if (!cardValidation.valid) {
        return throwError(() => new Error(cardValidation.error));
      }
    }

    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.post<PaymentResult>(`${this.apiUrl}/process`, dto).pipe(
      delay(100), // Simulate network latency
      tap(result => {
        if (result.success) {
          this.paymentsSignal.update(payments => [...payments, result.payment]);
        }
        this.loadingSignal.set(false);
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Get payment by ID
   */
  getPayment(id: string): Observable<Payment> {
    return this.http.get<Payment>(`${this.apiUrl}/${id}`).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Get payments for a user
   */
  getUserPayments(userId: string): Observable<Payment[]> {
    this.loadingSignal.set(true);

    return this.http.get<Payment[]>(`${this.apiUrl}/user/${userId}`).pipe(
      tap(payments => {
        this.paymentsSignal.set(payments);
        this.loadingSignal.set(false);
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Process a refund
   */
  refundPayment(dto: RefundDTO): Observable<PaymentResult> {
    if (dto.amount <= 0) {
      return throwError(() => new Error('Refund amount must be positive'));
    }

    if (!dto.reason || dto.reason.trim().length < 10) {
      return throwError(() => new Error('Refund reason must be at least 10 characters'));
    }

    this.loadingSignal.set(true);

    return this.http.post<PaymentResult>(`${this.apiUrl}/refund`, dto).pipe(
      tap(result => {
        if (result.success) {
          this.paymentsSignal.update(payments =>
            payments.map(p => p.id === result.payment.id ? result.payment : p)
          );
        }
        this.loadingSignal.set(false);
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Cancel a pending payment
   */
  cancelPayment(paymentId: string): Observable<Payment> {
    return this.http.post<Payment>(`${this.apiUrl}/${paymentId}/cancel`, {}).pipe(
      tap(payment => {
        this.paymentsSignal.update(payments =>
          payments.map(p => p.id === paymentId ? payment : p)
        );
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Get payment status
   */
  getPaymentStatus(paymentId: string): Observable<PaymentStatus> {
    return this.http.get<{ status: PaymentStatus }>(`${this.apiUrl}/${paymentId}/status`).pipe(
      map(response => response.status),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Validate credit card details
   */
  validateCardDetails(card: CardDetails): { valid: boolean; error?: string } {
    // Validate card number using Luhn algorithm
    if (!this.isValidLuhn(card.number)) {
      return { valid: false, error: 'Invalid card number' };
    }

    // Validate expiry
    if (!this.isValidExpiry(card.expiry)) {
      return { valid: false, error: 'Card has expired' };
    }

    // Validate CVV
    if (!this.isValidCVV(card.cvv)) {
      return { valid: false, error: 'Invalid CVV' };
    }

    // Validate holder name
    if (!card.holderName || card.holderName.trim().length < 2) {
      return { valid: false, error: 'Invalid cardholder name' };
    }

    return { valid: true };
  }

  /**
   * Luhn algorithm for card number validation
   */
  private isValidLuhn(cardNumber: string): boolean {
    const sanitized = cardNumber.replace(/\D/g, '');
    if (sanitized.length < 13 || sanitized.length > 19) {
      return false;
    }

    let sum = 0;
    let isEven = false;

    for (let i = sanitized.length - 1; i >= 0; i--) {
      let digit = parseInt(sanitized[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Validate card expiry date
   */
  private isValidExpiry(expiry: string): boolean {
    const match = expiry.match(/^(\d{2})\/(\d{2})$/);
    if (!match) {
      return false;
    }

    const month = parseInt(match[1], 10);
    const year = parseInt(match[2], 10) + 2000;

    if (month < 1 || month > 12) {
      return false;
    }

    const now = new Date();
    const expiryDate = new Date(year, month - 1);

    return expiryDate > now;
  }

  /**
   * Validate CVV
   */
  private isValidCVV(cvv: string): boolean {
    return /^\d{3,4}$/.test(cvv);
  }

  /**
   * Calculate processing fee
   */
  calculateProcessingFee(amount: number, method: string): number {
    const feeRates: Record<string, number> = {
      credit_card: 0.029,
      debit_card: 0.015,
      bank_transfer: 0.005,
      wallet: 0.02,
      crypto: 0.01
    };

    const rate = feeRates[method] || 0.03;
    return Math.round(amount * rate * 100) / 100;
  }

  /**
   * Format amount for display
   */
  formatAmount(amount: number, currency: Currency): string {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    });
    return formatter.format(amount);
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    this.loadingSignal.set(false);

    let message = 'An unexpected error occurred';

    if (error.error instanceof ErrorEvent) {
      message = error.error.message;
    } else if (error.status === 400) {
      message = error.error?.message || 'Invalid request';
    } else if (error.status === 401) {
      message = 'Unauthorized';
    } else if (error.status === 404) {
      message = 'Payment not found';
    } else if (error.status === 500) {
      message = 'Server error. Please try again later.';
    }

    this.errorSignal.set(message);
    return throwError(() => new Error(message));
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.errorSignal.set(null);
  }
}
