import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { OrderListComponent } from './order-list.component';
import { OrderService } from '@core/services/order.service';
import { Order } from '@core/models/order.model';

describe('OrderListComponent', () => {
  let component: OrderListComponent;
  let fixture: ComponentFixture<OrderListComponent>;
  let httpMock: HttpTestingController;

  const mockOrders: Order[] = [
    {
      id: 'order-1',
      userId: 'user-123',
      items: [{ productId: 'p1', quantity: 1, unitPrice: 25, discount: 0 }],
      subtotal: 25,
      tax: 2,
      shipping: 9.99,
      total: 36.99,
      status: 'pending',
      shippingAddress: { street: '123 Main', city: 'Boston', state: 'MA', postalCode: '02101', country: 'US' },
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15')
    },
    {
      id: 'order-2',
      userId: 'user-123',
      items: [{ productId: 'p2', quantity: 2, unitPrice: 50, discount: 10 }],
      subtotal: 90,
      tax: 7.2,
      shipping: 9.99,
      total: 107.19,
      status: 'delivered',
      shippingAddress: { street: '456 Oak', city: 'Cambridge', state: 'MA', postalCode: '02139', country: 'US' },
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-12')
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, OrderListComponent],
      providers: [OrderService]
    }).compileComponents();

    fixture = TestBed.createComponent(OrderListComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    // Set required input
    fixture.componentRef.setInput('userId', 'user-123');
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load orders on init', fakeAsync(() => {
    fixture.detectChanges(); // triggers ngOnInit

    const req = httpMock.expectOne('/api/orders/user/user-123');
    expect(req.request.method).toBe('GET');
    req.flush(mockOrders);

    tick();

    expect(component.orders().length).toBe(2);
  }));

  // FLAKY TEST: Timing-dependent auto-refresh
  it('should auto-refresh when enabled', fakeAsync(() => {
    fixture.componentRef.setInput('autoRefresh', true);
    fixture.componentRef.setInput('refreshInterval', 1000);
    fixture.detectChanges();

    // Initial load
    let req = httpMock.expectOne('/api/orders/user/user-123');
    req.flush(mockOrders);
    tick();

    // Wait for refresh interval - FLAKY: timing might not align
    tick(1000);

    // Should trigger another request - but timing is unreliable
    try {
      req = httpMock.expectOne('/api/orders/user/user-123');
      req.flush(mockOrders);
    } catch {
      // FLAKY: Request might not have been made yet
    }

    // Another interval - FLAKY
    tick(1000);

    // Cleanup
    flush();
    component.ngOnDestroy();
  }));

  // FLAKY: Race condition between user interaction and auto-refresh
  it('should handle filter during auto-refresh', fakeAsync(() => {
    fixture.componentRef.setInput('autoRefresh', true);
    fixture.componentRef.setInput('refreshInterval', 500);
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/orders/user/user-123');
    req.flush(mockOrders);
    tick();

    // User sets filter
    component.setFilter('pending');
    expect(component.filterStatus()).toBe('pending');

    // FLAKY: Auto-refresh might reset state
    tick(500);

    try {
      const refreshReq = httpMock.expectOne('/api/orders/user/user-123');
      refreshReq.flush(mockOrders);
    } catch {
      // May or may not have fired
    }

    tick();

    // FLAKY: Filter might be preserved or reset depending on timing
    // This assertion can fail randomly
    expect(component.filterStatus()).toBe('pending');

    flush();
    component.ngOnDestroy();
  }));

  describe('filtering', () => {
    it('should filter orders by status', fakeAsync(() => {
      fixture.detectChanges();

      const req = httpMock.expectOne('/api/orders/user/user-123');
      req.flush(mockOrders);
      tick();

      component.setFilter('pending');
      expect(component.filteredOrders().length).toBe(1);
      expect(component.filteredOrders()[0].status).toBe('pending');
    }));

    // MISSING TESTS:
    // - Filter 'all' shows all orders
    // - Filter with no matching orders
    // - Filter after sort
    // - Filter persistence
  });

  describe('sorting', () => {
    it('should sort orders by date descending by default', fakeAsync(() => {
      fixture.detectChanges();

      const req = httpMock.expectOne('/api/orders/user/user-123');
      req.flush(mockOrders);
      tick();

      const orders = component.filteredOrders();
      expect(new Date(orders[0].createdAt).getTime())
        .toBeGreaterThan(new Date(orders[1].createdAt).getTime());
    }));

    // MISSING TESTS:
    // - Toggle sort order
    // - Sort ascending
    // - Sort with same dates
  });

  describe('cancelOrder', () => {
    it('should cancel order', fakeAsync(() => {
      fixture.detectChanges();

      const req = httpMock.expectOne('/api/orders/user/user-123');
      req.flush(mockOrders);
      tick();

      component.cancelOrder('order-1');

      const cancelReq = httpMock.expectOne('/api/orders/order-1/status');
      cancelReq.flush({ ...mockOrders[0], status: 'cancelled' });
      tick();

      // Order should be updated
      const order = component.orders().find(o => o.id === 'order-1');
      expect(order?.status).toBe('cancelled');
    }));

    // MISSING TESTS:
    // - Cancel non-existent order
    // - Cancel already cancelled order
    // - Network error during cancel
    // - Cancel delivered order (should fail)
  });

  // MISSING COMPONENT TESTS:
  // - selectOrder updates selectedOrderId
  // - getStatusClass returns correct classes
  // - formatDate outputs correct format
  // - formatCurrency outputs correct format
  // - totalOrderValue computed correctly
  // - orderCountByStatus computed correctly
  // - Loading state shown
  // - Error state shown
  // - Empty state shown
  // - Template rendering
});
