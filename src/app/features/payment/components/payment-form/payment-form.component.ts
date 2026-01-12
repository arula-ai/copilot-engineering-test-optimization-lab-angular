import { Component, OnInit, OnDestroy, inject, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { PaymentService } from '@core/services/payment.service';
import {
  ProcessPaymentDTO,
  PaymentMethod,
  Currency,
  PaymentResult,
  SUPPORTED_CURRENCIES
} from '@core/models/payment.model';
import {
  creditCardValidator,
  cardExpiryValidator,
  cvvValidator,
  minAmountValidator,
  maxAmountValidator
} from '@shared/validators/validators';

@Component({
  selector: 'app-payment-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './payment-form.component.html',
  styleUrl: './payment-form.component.scss'
})
export class PaymentFormComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly paymentService = inject(PaymentService);
  private readonly destroy$ = new Subject<void>();

  // Outputs
  paymentComplete = output<PaymentResult>();
  paymentError = output<string>();

  // Form
  paymentForm!: FormGroup;

  // State signals
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);
  selectedMethod = signal<PaymentMethod>('credit_card');

  // Computed
  showCardFields = computed(() => {
    const method = this.selectedMethod();
    return method === 'credit_card' || method === 'debit_card';
  });

  processingFee = computed(() => {
    const amount = this.paymentForm?.get('amount')?.value || 0;
    const method = this.selectedMethod();
    return this.paymentService.calculateProcessingFee(amount, method);
  });

  totalAmount = computed(() => {
    const amount = this.paymentForm?.get('amount')?.value || 0;
    return amount + this.processingFee();
  });

  // Constants
  paymentMethods: { value: PaymentMethod; label: string }[] = [
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'debit_card', label: 'Debit Card' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'wallet', label: 'Digital Wallet' },
    { value: 'crypto', label: 'Cryptocurrency' }
  ];

  currencies = SUPPORTED_CURRENCIES;

  ngOnInit(): void {
    this.initForm();
    this.setupFormListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.paymentForm = this.fb.group({
      orderId: ['', Validators.required],
      userId: ['', Validators.required],
      amount: [0, [Validators.required, minAmountValidator(0.01), maxAmountValidator(1000000)]],
      currency: ['USD' as Currency, Validators.required],
      method: ['credit_card' as PaymentMethod, Validators.required],
      cardNumber: ['', [creditCardValidator()]],
      cardExpiry: ['', [cardExpiryValidator()]],
      cardCvv: ['', [cvvValidator()]],
      cardHolder: ['', [Validators.minLength(2)]]
    });
  }

  private setupFormListeners(): void {
    this.paymentForm.get('method')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((method: PaymentMethod) => {
        this.selectedMethod.set(method);
        this.updateCardValidators();
      });
  }

  private updateCardValidators(): void {
    const cardFields = ['cardNumber', 'cardExpiry', 'cardCvv', 'cardHolder'];

    if (this.showCardFields()) {
      this.paymentForm.get('cardNumber')?.setValidators([Validators.required, creditCardValidator()]);
      this.paymentForm.get('cardExpiry')?.setValidators([Validators.required, cardExpiryValidator()]);
      this.paymentForm.get('cardCvv')?.setValidators([Validators.required, cvvValidator()]);
      this.paymentForm.get('cardHolder')?.setValidators([Validators.required, Validators.minLength(2)]);
    } else {
      cardFields.forEach(field => {
        this.paymentForm.get(field)?.clearValidators();
        this.paymentForm.get(field)?.setValue('');
      });
    }

    cardFields.forEach(field => {
      this.paymentForm.get(field)?.updateValueAndValidity();
    });
  }

  onSubmit(): void {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const formValue = this.paymentForm.value;
    const dto: ProcessPaymentDTO = {
      orderId: formValue.orderId,
      userId: formValue.userId,
      amount: formValue.amount,
      currency: formValue.currency,
      method: formValue.method
    };

    if (this.showCardFields()) {
      dto.cardDetails = {
        number: formValue.cardNumber,
        expiry: formValue.cardExpiry,
        cvv: formValue.cardCvv,
        holderName: formValue.cardHolder
      };
    }

    this.paymentService.processPayment(dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.isSubmitting.set(false);
          if (result.success) {
            this.paymentComplete.emit(result);
            this.paymentForm.reset();
            this.initForm();
          } else {
            this.errorMessage.set(result.message || 'Payment failed');
            this.paymentError.emit(result.message || 'Payment failed');
          }
        },
        error: (error) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(error.message);
          this.paymentError.emit(error.message);
        }
      });
  }

  formatCurrency(amount: number): string {
    const currency = this.paymentForm.get('currency')?.value || 'USD';
    return this.paymentService.formatAmount(amount, currency);
  }

  getFieldError(fieldName: string): string | null {
    const control = this.paymentForm.get(fieldName);
    if (!control || !control.errors || !control.touched) {
      return null;
    }

    const errors = control.errors;

    if (errors['required']) return `${fieldName} is required`;
    if (errors['minAmount']) return `Minimum amount is ${errors['minAmount'].min}`;
    if (errors['maxAmount']) return `Maximum amount is ${errors['maxAmount'].max}`;
    if (errors['creditCard']) return 'Invalid card number';
    if (errors['cardExpiry']) return 'Invalid or expired card';
    if (errors['cvv']) return 'Invalid CVV';
    if (errors['minlength']) return `Minimum ${errors['minlength'].requiredLength} characters`;

    return 'Invalid input';
  }
}
