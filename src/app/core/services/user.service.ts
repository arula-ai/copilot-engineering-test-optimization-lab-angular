import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import {
  User,
  CreateUserDTO,
  UpdateUserDTO,
  LoginDTO,
  AuthResponse,
  UserStatus
} from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly apiUrl = '/api/users';

  // Signal-based state
  private currentUserSignal = signal<User | null>(null);
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);

  // Auth state using BehaviorSubject for RxJS compatibility
  private tokenSubject = new BehaviorSubject<string | null>(null);

  // Computed signals
  public readonly currentUser = computed(() => this.currentUserSignal());
  public readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);
  public readonly isLoading = computed(() => this.loadingSignal());
  public readonly error = computed(() => this.errorSignal());

  private readonly http = inject(HttpClient);

  constructor() {
    this.loadStoredAuth();
  }

  /**
   * Register a new user
   */
  register(dto: CreateUserDTO): Observable<AuthResponse> {
    // Validate email
    if (!this.isValidEmail(dto.email)) {
      return throwError(() => new Error('Invalid email format'));
    }

    // Validate password
    const passwordValidation = this.validatePassword(dto.password);
    if (!passwordValidation.valid) {
      return throwError(() => new Error(passwordValidation.error));
    }

    // Validate name
    if (!dto.firstName || dto.firstName.trim().length < 2) {
      return throwError(() => new Error('First name must be at least 2 characters'));
    }

    if (!dto.lastName || dto.lastName.trim().length < 2) {
      return throwError(() => new Error('Last name must be at least 2 characters'));
    }

    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, dto).pipe(
      tap(response => this.handleAuthSuccess(response)),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Login user
   */
  login(dto: LoginDTO): Observable<AuthResponse> {
    if (!this.isValidEmail(dto.email)) {
      return throwError(() => new Error('Invalid email format'));
    }

    if (!dto.password) {
      return throwError(() => new Error('Password is required'));
    }

    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, dto).pipe(
      tap(response => this.handleAuthSuccess(response)),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Logout current user
   */
  logout(): void {
    this.currentUserSignal.set(null);
    this.tokenSubject.next(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  }

  /**
   * Get user by ID
   */
  getUser(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Update current user profile
   */
  updateProfile(dto: UpdateUserDTO): Observable<User> {
    const currentUser = this.currentUserSignal();
    if (!currentUser) {
      return throwError(() => new Error('No user logged in'));
    }

    this.loadingSignal.set(true);

    return this.http.patch<User>(`${this.apiUrl}/${currentUser.id}`, dto).pipe(
      tap(user => {
        this.currentUserSignal.set(user);
        localStorage.setItem('user', JSON.stringify(user));
        this.loadingSignal.set(false);
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Change user password
   */
  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    const passwordValidation = this.validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return throwError(() => new Error(passwordValidation.error));
    }

    if (currentPassword === newPassword) {
      return throwError(() => new Error('New password must be different from current password'));
    }

    return this.http.post<void>(`${this.apiUrl}/change-password`, {
      currentPassword,
      newPassword
    }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Request password reset
   */
  requestPasswordReset(email: string): Observable<void> {
    if (!this.isValidEmail(email)) {
      return throwError(() => new Error('Invalid email format'));
    }

    return this.http.post<void>(`${this.apiUrl}/reset-password`, { email }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Deactivate user account
   */
  deactivateAccount(): Observable<void> {
    const currentUser = this.currentUserSignal();
    if (!currentUser) {
      return throwError(() => new Error('No user logged in'));
    }

    return this.http.post<void>(`${this.apiUrl}/${currentUser.id}/deactivate`, {}).pipe(
      tap(() => this.logout()),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Update user status (admin only)
   */
  updateUserStatus(userId: string, status: UserStatus): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${userId}/status`, { status }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  validatePassword(password: string): { valid: boolean; error?: string } {
    if (!password || password.length < 8) {
      return { valid: false, error: 'Password must be at least 8 characters' };
    }

    if (!/[A-Z]/.test(password)) {
      return { valid: false, error: 'Password must contain at least one uppercase letter' };
    }

    if (!/[a-z]/.test(password)) {
      return { valid: false, error: 'Password must contain at least one lowercase letter' };
    }

    if (!/\d/.test(password)) {
      return { valid: false, error: 'Password must contain at least one number' };
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return { valid: false, error: 'Password must contain at least one special character' };
    }

    return { valid: true };
  }

  /**
   * Validate phone number
   */
  isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s-()]{10,}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Format user display name
   */
  getDisplayName(user: User): string {
    return `${user.firstName} ${user.lastName}`;
  }

  /**
   * Get auth token
   */
  getToken(): string | null {
    return this.tokenSubject.value;
  }

  /**
   * Handle successful authentication
   */
  private handleAuthSuccess(response: AuthResponse): void {
    this.currentUserSignal.set(response.user);
    this.tokenSubject.next(response.token);
    localStorage.setItem('auth_token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    this.loadingSignal.set(false);
  }

  /**
   * Load stored authentication
   */
  private loadStoredAuth(): void {
    try {
      const token = localStorage.getItem('auth_token');
      const userJson = localStorage.getItem('user');

      if (token && userJson) {
        const user = JSON.parse(userJson) as User;
        this.currentUserSignal.set(user);
        this.tokenSubject.next(token);
      }
    } catch {
      // Invalid stored data, clear it
      this.logout();
    }
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
      message = 'Invalid credentials';
      this.logout();
    } else if (error.status === 404) {
      message = 'User not found';
    } else if (error.status === 409) {
      message = 'Email already registered';
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
