import { Injectable, signal, computed, OnDestroy, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, throwError, timer } from 'rxjs';
import { takeUntil, tap, catchError, retry } from 'rxjs/operators';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  priority: NotificationPriority;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  expiresAt?: Date;
}

export type NotificationType =
  | 'order_update'
  | 'payment_confirmation'
  | 'shipping_update'
  | 'promotion'
  | 'system'
  | 'reminder';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  types: NotificationType[];
}

export interface SendNotificationDTO {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  metadata?: Record<string, unknown>;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  private readonly apiUrl = '/api/notifications';
  private readonly destroy$ = new Subject<void>();

  // Signal-based state
  private notificationsSignal = signal<Notification[]>([]);
  private unreadCountSignal = signal<number>(0);
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);
  private preferencesSignal = signal<NotificationPreferences | null>(null);

  // Computed signals
  public readonly notifications = computed(() => this.notificationsSignal());
  public readonly unreadCount = computed(() => this.unreadCountSignal());
  public readonly isLoading = computed(() => this.loadingSignal());
  public readonly error = computed(() => this.errorSignal());
  public readonly preferences = computed(() => this.preferencesSignal());

  public readonly unreadNotifications = computed(() =>
    this.notificationsSignal().filter(n => !n.read)
  );

  public readonly urgentNotifications = computed(() =>
    this.notificationsSignal().filter(n => n.priority === 'urgent' && !n.read)
  );

  private readonly http = inject(HttpClient);

  /**
   * Get all notifications for a user
   */
  getNotifications(userId: string): Observable<Notification[]> {
    this.loadingSignal.set(true);

    return this.http.get<Notification[]>(`${this.apiUrl}/user/${userId}`).pipe(
      tap(notifications => {
        this.notificationsSignal.set(notifications);
        this.unreadCountSignal.set(notifications.filter(n => !n.read).length);
        this.loadingSignal.set(false);
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Send a notification
   */
  sendNotification(dto: SendNotificationDTO): Observable<Notification> {
    if (!dto.title || dto.title.length < 2) {
      return throwError(() => new Error('Notification title is required'));
    }

    if (!dto.message || dto.message.length < 5) {
      return throwError(() => new Error('Notification message must be at least 5 characters'));
    }

    return this.http.post<Notification>(`${this.apiUrl}/send`, {
      ...dto,
      priority: dto.priority || 'medium'
    }).pipe(
      tap(notification => {
        this.notificationsSignal.update(notifications => [notification, ...notifications]);
        if (!notification.read) {
          this.unreadCountSignal.update(count => count + 1);
        }
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): Observable<Notification> {
    return this.http.patch<Notification>(`${this.apiUrl}/${notificationId}/read`, {}).pipe(
      tap(notification => {
        this.notificationsSignal.update(notifications =>
          notifications.map(n => n.id === notificationId ? notification : n)
        );
        this.unreadCountSignal.update(count => Math.max(0, count - 1));
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(userId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/user/${userId}/read-all`, {}).pipe(
      tap(() => {
        this.notificationsSignal.update(notifications =>
          notifications.map(n => ({ ...n, read: true }))
        );
        this.unreadCountSignal.set(0);
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Delete a notification
   */
  deleteNotification(notificationId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${notificationId}`).pipe(
      tap(() => {
        const notification = this.notificationsSignal().find(n => n.id === notificationId);
        this.notificationsSignal.update(notifications =>
          notifications.filter(n => n.id !== notificationId)
        );
        if (notification && !notification.read) {
          this.unreadCountSignal.update(count => Math.max(0, count - 1));
        }
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Delete all notifications for a user
   */
  deleteAllNotifications(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/user/${userId}`).pipe(
      tap(() => {
        this.notificationsSignal.set([]);
        this.unreadCountSignal.set(0);
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Get notification preferences
   */
  getPreferences(userId: string): Observable<NotificationPreferences> {
    return this.http.get<NotificationPreferences>(`${this.apiUrl}/preferences/${userId}`).pipe(
      tap(preferences => this.preferencesSignal.set(preferences)),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Update notification preferences
   */
  updatePreferences(userId: string, preferences: Partial<NotificationPreferences>): Observable<NotificationPreferences> {
    return this.http.patch<NotificationPreferences>(
      `${this.apiUrl}/preferences/${userId}`,
      preferences
    ).pipe(
      tap(prefs => this.preferencesSignal.set(prefs)),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Send batch notifications
   */
  sendBatchNotifications(notifications: SendNotificationDTO[]): Observable<Notification[]> {
    if (notifications.length === 0) {
      return throwError(() => new Error('At least one notification is required'));
    }

    if (notifications.length > 100) {
      return throwError(() => new Error('Cannot send more than 100 notifications at once'));
    }

    return this.http.post<Notification[]>(`${this.apiUrl}/batch`, { notifications }).pipe(
      tap(newNotifications => {
        this.notificationsSignal.update(existing => [...newNotifications, ...existing]);
        const newUnread = newNotifications.filter(n => !n.read).length;
        this.unreadCountSignal.update(count => count + newUnread);
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Subscribe to real-time notifications (WebSocket simulation)
   * This method is intentionally complex for testing purposes
   */
  subscribeToNotifications(userId: string): Observable<Notification> {
    return new Observable<Notification>(observer => {
      // Simulate WebSocket connection with polling
      const pollInterval = timer(0, 10000).pipe(
        takeUntil(this.destroy$)
      );

      const subscription = pollInterval.subscribe({
        next: () => {
          this.http.get<Notification[]>(`${this.apiUrl}/user/${userId}/new`).pipe(
            retry(3),
            catchError(() => {
              return [];
            })
          ).subscribe({
            next: (notifications: Notification[]) => {
              notifications.forEach(n => observer.next(n));
            }
          });
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    });
  }

  /**
   * Schedule a notification for later
   */
  scheduleNotification(dto: SendNotificationDTO, scheduledAt: Date): Observable<Notification> {
    if (scheduledAt <= new Date()) {
      return throwError(() => new Error('Scheduled time must be in the future'));
    }

    return this.http.post<Notification>(`${this.apiUrl}/schedule`, {
      ...dto,
      scheduledAt
    }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Get notification statistics
   */
  getStatistics(userId: string): Observable<{
    total: number;
    unread: number;
    byType: Record<NotificationType, number>;
    byPriority: Record<NotificationPriority, number>;
  }> {
    return this.http.get<{
      total: number;
      unread: number;
      byType: Record<NotificationType, number>;
      byPriority: Record<NotificationPriority, number>;
    }>(`${this.apiUrl}/statistics/${userId}`).pipe(
      catchError(error => this.handleError(error))
    );
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
    } else if (error.status === 404) {
      message = 'Notification not found';
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

  /**
   * Cleanup on destroy
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
