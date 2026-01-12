import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { map, tap, catchError, switchMap, take } from 'rxjs/operators';
import {
  Order,
  OrderItem,
  CreateOrderDTO,
  UpdateOrderDTO,
  OrderStatus,
  ORDER_STATUS_TRANSITIONS,
  TAX_RATE,
  FREE_SHIPPING_THRESHOLD,
  STANDARD_SHIPPING_COST
} from '../models/order.model';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private readonly apiUrl = '/api/orders';

  // Signal-based state
  private ordersSignal = signal<Order[]>([]);
  private currentOrderSignal = signal<Order | null>(null);
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);

  // Computed signals
  public readonly orders = computed(() => this.ordersSignal());
  public readonly currentOrder = computed(() => this.currentOrderSignal());
  public readonly isLoading = computed(() => this.loadingSignal());
  public readonly error = computed(() => this.errorSignal());

  public readonly pendingOrders = computed(() =>
    this.ordersSignal().filter(o => o.status === 'pending')
  );

  public readonly completedOrders = computed(() =>
    this.ordersSignal().filter(o => o.status === 'delivered')
  );

  constructor(private readonly http: HttpClient) {}

  /**
   * Create a new order
   */
  createOrder(dto: CreateOrderDTO): Observable<Order> {
    // Validate items
    if (!dto.items || dto.items.length === 0) {
      return throwError(() => new Error('Order must contain at least one item'));
    }

    for (const item of dto.items) {
      if (item.quantity <= 0) {
        return throwError(() => new Error('Item quantity must be positive'));
      }
      if (item.unitPrice < 0) {
        return throwError(() => new Error('Item price cannot be negative'));
      }
    }

    // Validate shipping address
    if (!this.isValidAddress(dto.shippingAddress)) {
      return throwError(() => new Error('Invalid shipping address'));
    }

    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    // Calculate totals locally
    const orderData = {
      ...dto,
      ...this.calculateOrderTotals(dto.items)
    };

    return this.http.post<Order>(`${this.apiUrl}`, orderData).pipe(
      tap(order => {
        this.ordersSignal.update(orders => [...orders, order]);
        this.currentOrderSignal.set(order);
        this.loadingSignal.set(false);
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Get order by ID
   */
  getOrder(id: string): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/${id}`).pipe(
      tap(order => this.currentOrderSignal.set(order)),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Get orders for a user
   */
  getUserOrders(userId: string): Observable<Order[]> {
    this.loadingSignal.set(true);

    return this.http.get<Order[]>(`${this.apiUrl}/user/${userId}`).pipe(
      tap(orders => {
        this.ordersSignal.set(orders);
        this.loadingSignal.set(false);
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Update order status
   */
  updateOrderStatus(orderId: string, newStatus: OrderStatus): Observable<Order> {
    // Client-side validation of status transition
    const currentOrder = this.ordersSignal().find(o => o.id === orderId);

    if (currentOrder) {
      const allowedTransitions = ORDER_STATUS_TRANSITIONS[currentOrder.status];
      if (!allowedTransitions.includes(newStatus)) {
        return throwError(() =>
          new Error(`Cannot transition from ${currentOrder.status} to ${newStatus}`)
        );
      }
    }

    return this.http.patch<Order>(`${this.apiUrl}/${orderId}/status`, { status: newStatus }).pipe(
      tap(order => {
        this.ordersSignal.update(orders =>
          orders.map(o => o.id === orderId ? order : o)
        );
        if (this.currentOrderSignal()?.id === orderId) {
          this.currentOrderSignal.set(order);
        }
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Update order items
   */
  updateOrder(orderId: string, dto: UpdateOrderDTO): Observable<Order> {
    const currentOrder = this.ordersSignal().find(o => o.id === orderId);

    if (currentOrder && currentOrder.status !== 'draft') {
      return throwError(() =>
        new Error('Can only update orders in draft status')
      );
    }

    return this.http.patch<Order>(`${this.apiUrl}/${orderId}`, dto).pipe(
      tap(order => {
        this.ordersSignal.update(orders =>
          orders.map(o => o.id === orderId ? order : o)
        );
        if (this.currentOrderSignal()?.id === orderId) {
          this.currentOrderSignal.set(order);
        }
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Cancel an order
   */
  cancelOrder(orderId: string): Observable<Order> {
    const order = this.ordersSignal().find(o => o.id === orderId);

    if (order && (order.status === 'shipped' || order.status === 'delivered')) {
      return throwError(() =>
        new Error(`Cannot cancel order in ${order.status} status`)
      );
    }

    return this.updateOrderStatus(orderId, 'cancelled');
  }

  /**
   * Add item to order
   */
  addItemToOrder(orderId: string, item: OrderItem): Observable<Order> {
    if (item.quantity <= 0) {
      return throwError(() => new Error('Quantity must be positive'));
    }

    return this.http.post<Order>(`${this.apiUrl}/${orderId}/items`, item).pipe(
      tap(order => {
        this.ordersSignal.update(orders =>
          orders.map(o => o.id === orderId ? order : o)
        );
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Remove item from order
   */
  removeItemFromOrder(orderId: string, productId: string): Observable<Order> {
    return this.http.delete<Order>(`${this.apiUrl}/${orderId}/items/${productId}`).pipe(
      tap(order => {
        this.ordersSignal.update(orders =>
          orders.map(o => o.id === orderId ? order : o)
        );
      }),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Calculate order totals
   */
  calculateOrderTotals(items: OrderItem[]): { subtotal: number; tax: number; shipping: number; total: number } {
    const subtotal = items.reduce((sum, item) => {
      const itemTotal = item.unitPrice * item.quantity * (1 - item.discount / 100);
      return sum + itemTotal;
    }, 0);

    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_COST;
    const total = Math.round((subtotal + tax + shipping) * 100) / 100;

    return { subtotal, tax, shipping, total };
  }

  /**
   * Track order by tracking number
   */
  trackOrder(trackingNumber: string): Observable<{ status: string; location: string; estimatedDelivery: Date }> {
    return this.http.get<{ status: string; location: string; estimatedDelivery: Date }>(
      `${this.apiUrl}/track/${trackingNumber}`
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Poll for order status updates
   * This method is intentionally flaky for testing purposes
   */
  pollOrderStatus(orderId: string, intervalMs: number = 5000): Observable<Order> {
    return timer(0, intervalMs).pipe(
      switchMap(() => this.getOrder(orderId)),
      take(10) // Max 10 polls
    );
  }

  /**
   * Validate address
   */
  private isValidAddress(address: CreateOrderDTO['shippingAddress']): boolean {
    if (!address) return false;

    return !!(
      address.street &&
      address.street.length >= 5 &&
      address.city &&
      address.city.length >= 2 &&
      address.state &&
      address.state.length >= 2 &&
      address.postalCode &&
      address.postalCode.length >= 5 &&
      address.country &&
      address.country.length >= 2
    );
  }

  /**
   * Get estimated delivery date
   */
  getEstimatedDelivery(shippingMethod: 'standard' | 'express' | 'overnight'): Date {
    const now = new Date();
    const days = {
      standard: 5,
      express: 2,
      overnight: 1
    };

    const deliveryDate = new Date(now);
    deliveryDate.setDate(deliveryDate.getDate() + days[shippingMethod]);

    // Skip weekends
    while (deliveryDate.getDay() === 0 || deliveryDate.getDay() === 6) {
      deliveryDate.setDate(deliveryDate.getDate() + 1);
    }

    return deliveryDate;
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
      message = 'Order not found';
    } else if (error.status === 409) {
      message = 'Order conflict - please refresh';
    } else if (error.status === 500) {
      message = 'Server error. Please try again later.';
    }

    this.errorSignal.set(message);
    return throwError(() => new Error(message));
  }

  /**
   * Clear current order
   */
  clearCurrentOrder(): void {
    this.currentOrderSignal.set(null);
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.errorSignal.set(null);
  }
}
