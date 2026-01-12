import { Component, OnDestroy, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { UserService } from '@core/services/user.service';
import { AuthResponse } from '@core/models/user.model';
import { emailValidator, passwordStrengthValidator } from '@shared/validators/validators';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly destroy$ = new Subject<void>();

  // Outputs
  loginSuccess = output<AuthResponse>();
  loginError = output<string>();

  // Form
  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, emailValidator()]],
    password: ['', [Validators.required]],
    rememberMe: [false]
  });

  // State
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.value;

    this.userService.login({ email, password })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isSubmitting.set(false);
          this.loginSuccess.emit(response);
        },
        error: (error) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(error.message);
          this.loginError.emit(error.message);
        }
      });
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  getFieldError(fieldName: string): string | null {
    const control = this.loginForm.get(fieldName);
    if (!control || !control.errors || !control.touched) {
      return null;
    }

    if (control.errors['required']) return `${fieldName} is required`;
    if (control.errors['email']) return 'Invalid email format';

    return 'Invalid input';
  }
}
