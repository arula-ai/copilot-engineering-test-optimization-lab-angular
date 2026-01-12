import { Component, OnInit, OnDestroy, inject, signal, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, timer } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';

import { OrderService } from '@core/services/order.service';
import { Order, OrderStatus } from '@core/models/order.model';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-list.component.html',
  styleUrl: './order-list.component.scss'
})
export class OrderListComponent implements OnInit, OnDestroy {
  private readonly orderService = inject(OrderService);
  private readonly destroy$ = new Subject<void>();

  // Inputs
  userId = input.required<string>();
  autoRefresh = input<boolean>(false);
  refreshInterval = input<number>(30000);

  // State signals
  orders = signal<Order[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);
  selectedOrderId = signal<string | null>(null);
  filterStatus = signal<OrderStatus | 'all'>('all');
  sortOrder = signal<'asc' | 'desc'>('desc');

  // Computed
  filteredOrders = computed(() => {
    let result = this.orders();
    const status = this.filterStatus();

    if (status !== 'all') {
      result = result.filter(o => o.status === status);
    }

    return result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return this.sortOrder() === 'desc' ? dateB - dateA : dateA - dateB;
    });
  });

  totalOrderValue = computed(() => {
    return this.orders().reduce((sum, order) => sum + order.total, 0);
  });

  orderCountByStatus = computed(() => {
    const counts: Partial<Record<OrderStatus, number>> = {};
    this.orders().forEach(order => {
      counts[order.status] = (counts[order.status] || 0) + 1;
    });
    return counts;
  });

  statusOptions: (OrderStatus | 'all')[] = [
    'all', 'draft', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'
  ];

  ngOnInit(): void {
    this.loadOrders();

    if (this.autoRefresh()) {
      this.setupAutoRefresh();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadOrders(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.orderService.getUserOrders(this.userId())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (orders) => {
          this.orders.set(orders);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.error.set(err.message);
          this.isLoading.set(false);
        }
      });
  }

  private setupAutoRefresh(): void {
    // This creates a potential race condition for testing purposes
    timer(this.refreshInterval(), this.refreshInterval())
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.orderService.getUserOrders(this.userId()))
      )
      .subscribe({
        next: (orders) => {
          // Race condition: UI might be in middle of user interaction
          this.orders.set(orders);
        },
        error: () => {
          // Silently fail on refresh errors
        }
      });
  }

  selectOrder(orderId: string): void {
    this.selectedOrderId.set(orderId);
  }

  setFilter(status: OrderStatus | 'all'): void {
    this.filterStatus.set(status);
  }

  toggleSortOrder(): void {
    this.sortOrder.update(current => current === 'asc' ? 'desc' : 'asc');
  }

  cancelOrder(orderId: string): void {
    this.orderService.cancelOrder(orderId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedOrder) => {
          this.orders.update(orders =>
            orders.map(o => o.id === orderId ? updatedOrder : o)
          );
        },
        error: (err) => {
          this.error.set(err.message);
        }
      });
  }

  getStatusClass(status: OrderStatus): string {
    const classes: Record<OrderStatus, string> = {
      draft: 'status-draft',
      pending: 'status-pending',
      confirmed: 'status-confirmed',
      processing: 'status-processing',
      shipped: 'status-shipped',
      delivered: 'status-delivered',
      cancelled: 'status-cancelled',
      refunded: 'status-refunded'
    };
    return classes[status] || '';
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  trackByOrderId(index: number, order: Order): string {
    return order.id;
  }
}
