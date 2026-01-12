/**
 * GOLDEN EXAMPLE: Comprehensive Error Handling Testing
 *
 * PATTERN: Defense-in-Depth Error Testing
 *
 * WHEN TO USE:
 * - Testing service error propagation
 * - Verifying user-facing error messages
 * - Testing error recovery and retry logic
 * - Validating error boundary behavior
 *
 * ANTI-PATTERNS THIS SOLVES:
 * ❌ Only testing happy path
 * ❌ Generic "should handle error" tests
 * ❌ Not testing error message content
 * ❌ Missing error state cleanup tests
 *
 * KEY PRINCIPLES:
 * 1. Test EVERY error path, not just "an error"
 * 2. Verify error messages are user-friendly
 * 3. Test error state transitions
 * 4. Ensure proper cleanup after errors
 */

import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { OrderService, OrderError, OrderErrorCode } from './order.service';

describe('OrderService - Error Handling Golden Example', () => {
  let service: OrderService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [OrderService]
    });
    service = TestBed.inject(OrderService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ============================================================
  // PATTERN 1: Typed Error Classification
  // ============================================================
  describe('error classification', () => {
    test.each([
      [400, OrderErrorCode.VALIDATION_ERROR, 'Invalid order data'],
      [401, OrderErrorCode.AUTHENTICATION_ERROR, 'Please log in to continue'],
      [403, OrderErrorCode.AUTHORIZATION_ERROR, 'You do not have permission'],
      [404, OrderErrorCode.NOT_FOUND, 'Order not found'],
      [409, OrderErrorCode.CONFLICT, 'Order has been modified'],
      [422, OrderErrorCode.BUSINESS_RULE_VIOLATION, 'Cannot process order'],
      [429, OrderErrorCode.RATE_LIMITED, 'Too many requests'],
      [500, OrderErrorCode.SERVER_ERROR, 'Something went wrong'],
      [502, OrderErrorCode.SERVER_ERROR, 'Service temporarily unavailable'],
      [503, OrderErrorCode.SERVICE_UNAVAILABLE, 'Service is currently unavailable'],
    ])('should classify HTTP %d as %s with message "%s"',
      (status, expectedCode, expectedMessage) => {
        // Arrange
        let error: OrderError | undefined;

        // Act
        service.getOrder('order-123').subscribe({
          error: (e) => { error = e; }
        });

        httpMock.expectOne('/api/orders/order-123').flush(
          { message: 'Server error message' },
          { status, statusText: 'Error' }
        );

        // Assert - Error is properly typed and classified
        expect(error).toBeInstanceOf(OrderError);
        expect(error?.code).toBe(expectedCode);
        expect(error?.userMessage).toContain(expectedMessage);
        expect(error?.isRetryable).toBe(status >= 500 || status === 429);
      }
    );
  });

  // ============================================================
  // PATTERN 2: Error State Management
  // ============================================================
  describe('error state transitions', () => {
    it('should set error state on failure', () => {
      // Arrange - Verify initial state
      expect(service.error()).toBeNull();
      expect(service.isLoading()).toBe(false);

      // Act
      service.getOrder('order-123').subscribe({ error: () => {} });

      // During request
      expect(service.isLoading()).toBe(true);
      expect(service.error()).toBeNull();

      // Fail the request
      httpMock.expectOne('/api/orders/order-123').flush(null, {
        status: 500,
        statusText: 'Server Error'
      });

      // Assert - Error state set, loading cleared
      expect(service.isLoading()).toBe(false);
      expect(service.error()).not.toBeNull();
      expect(service.error()?.code).toBe(OrderErrorCode.SERVER_ERROR);
    });

    it('should clear error on successful retry', () => {
      // Arrange - Put service in error state
      service.getOrder('order-123').subscribe({ error: () => {} });
      httpMock.expectOne('/api/orders/order-123').flush(null, {
        status: 500,
        statusText: 'Error'
      });
      expect(service.error()).not.toBeNull();

      // Act - Retry successfully
      service.getOrder('order-123').subscribe();
      httpMock.expectOne('/api/orders/order-123').flush({ id: 'order-123' });

      // Assert - Error cleared
      expect(service.error()).toBeNull();
    });

    it('should preserve data on error (optimistic UI pattern)', () => {
      // Arrange - Load initial data
      service.getOrder('order-123').subscribe();
      httpMock.expectOne('/api/orders/order-123').flush({
        id: 'order-123',
        status: 'pending',
        items: [{ id: 'item-1', quantity: 2 }]
      });

      const initialData = service.currentOrder();
      expect(initialData).not.toBeNull();

      // Act - Refresh fails
      service.refreshOrder('order-123').subscribe({ error: () => {} });
      httpMock.expectOne('/api/orders/order-123').flush(null, {
        status: 500,
        statusText: 'Error'
      });

      // Assert - Original data preserved
      expect(service.currentOrder()).toEqual(initialData);
      expect(service.error()).not.toBeNull();
      expect(service.isStale()).toBe(true);
    });
  });

  // ============================================================
  // PATTERN 3: Retry Logic Testing
  // ============================================================
  describe('retry behavior', () => {
    it('should retry transient errors up to 3 times', fakeAsync(() => {
      // Arrange
      let attempts = 0;
      let finalError: OrderError | undefined;

      // Act
      service.getOrderWithRetry('order-123').subscribe({
        error: (e) => { finalError = e; }
      });

      // Fail 3 times
      for (let i = 0; i < 3; i++) {
        tick(1000 * Math.pow(2, i)); // Exponential backoff
        const req = httpMock.expectOne('/api/orders/order-123');
        req.flush(null, { status: 503, statusText: 'Service Unavailable' });
        attempts++;
      }

      // Assert
      expect(attempts).toBe(3);
      expect(finalError).toBeDefined();
      expect(finalError?.retryAttempts).toBe(3);
    }));

    it('should NOT retry non-retryable errors', fakeAsync(() => {
      // Arrange
      let error: OrderError | undefined;

      // Act
      service.getOrderWithRetry('order-123').subscribe({
        error: (e) => { error = e; }
      });

      // 400 is not retryable
      httpMock.expectOne('/api/orders/order-123').flush(
        { message: 'Invalid order ID' },
        { status: 400, statusText: 'Bad Request' }
      );

      // Advance time - no retry should happen
      tick(10000);
      httpMock.expectNone('/api/orders/order-123');

      // Assert
      expect(error?.isRetryable).toBe(false);
      expect(error?.retryAttempts).toBe(0);
    }));

    it('should succeed on retry after transient failure', fakeAsync(() => {
      // Arrange
      let result: any;

      // Act
      service.getOrderWithRetry('order-123').subscribe({
        next: (r) => { result = r; }
      });

      // First request fails
      httpMock.expectOne('/api/orders/order-123').flush(null, {
        status: 503,
        statusText: 'Service Unavailable'
      });

      // Retry succeeds
      tick(1000);
      httpMock.expectOne('/api/orders/order-123').flush({
        id: 'order-123',
        status: 'confirmed'
      });

      // Assert
      expect(result).toEqual({ id: 'order-123', status: 'confirmed' });
      expect(service.error()).toBeNull();
    }));
  });

  // ============================================================
  // PATTERN 4: Validation Error Details
  // ============================================================
  describe('validation errors', () => {
    it('should extract field-level validation errors', () => {
      // Arrange
      let error: OrderError | undefined;

      // Act
      service.createOrder({}).subscribe({
        error: (e) => { error = e; }
      });

      httpMock.expectOne('/api/orders').flush({
        message: 'Validation failed',
        errors: [
          { field: 'items', message: 'At least one item required' },
          { field: 'shippingAddress', message: 'Shipping address required' },
          { field: 'paymentMethod', message: 'Payment method required' }
        ]
      }, { status: 422, statusText: 'Unprocessable Entity' });

      // Assert
      expect(error?.code).toBe(OrderErrorCode.BUSINESS_RULE_VIOLATION);
      expect(error?.fieldErrors).toHaveLength(3);
      expect(error?.fieldErrors).toContainEqual({
        field: 'items',
        message: 'At least one item required'
      });
      expect(error?.hasFieldError('shippingAddress')).toBe(true);
      expect(error?.getFieldError('paymentMethod')).toBe('Payment method required');
    });

    it('should handle validation error without field details', () => {
      // Arrange
      let error: OrderError | undefined;

      // Act
      service.createOrder({}).subscribe({
        error: (e) => { error = e; }
      });

      httpMock.expectOne('/api/orders').flush({
        message: 'Invalid order'
      }, { status: 400, statusText: 'Bad Request' });

      // Assert
      expect(error?.fieldErrors).toEqual([]);
      expect(error?.userMessage).toBe('Invalid order');
    });
  });

  // ============================================================
  // PATTERN 5: Network Error Handling
  // ============================================================
  describe('network errors', () => {
    it('should handle complete network failure', () => {
      // Arrange
      let error: OrderError | undefined;

      // Act
      service.getOrder('order-123').subscribe({
        error: (e) => { error = e; }
      });

      httpMock.expectOne('/api/orders/order-123').error(
        new ProgressEvent('error'),
        { status: 0, statusText: 'Unknown Error' }
      );

      // Assert
      expect(error?.code).toBe(OrderErrorCode.NETWORK_ERROR);
      expect(error?.userMessage).toContain('network');
      expect(error?.isRetryable).toBe(true);
    });

    it('should handle timeout', fakeAsync(() => {
      // Arrange
      let error: OrderError | undefined;

      // Act
      service.getOrderWithTimeout('order-123', 5000).subscribe({
        error: (e) => { error = e; }
      });

      // Don't respond - let it timeout
      tick(5001);

      // Assert
      expect(error?.code).toBe(OrderErrorCode.TIMEOUT);
      expect(error?.userMessage).toContain('timed out');
      expect(error?.isRetryable).toBe(true);

      // Clean up pending request
      httpMock.expectOne('/api/orders/order-123').flush({});
    }));

    it('should handle DNS resolution failure', () => {
      // Arrange
      let error: OrderError | undefined;

      // Act
      service.getOrder('order-123').subscribe({
        error: (e) => { error = e; }
      });

      // Simulate DNS failure
      httpMock.expectOne('/api/orders/order-123').error(
        new ProgressEvent('error', { message: 'net::ERR_NAME_NOT_RESOLVED' })
      );

      // Assert
      expect(error?.code).toBe(OrderErrorCode.NETWORK_ERROR);
      expect(error?.isRetryable).toBe(true);
    });
  });

  // ============================================================
  // PATTERN 6: Error Recovery Actions
  // ============================================================
  describe('error recovery', () => {
    it('should provide recovery actions for auth errors', () => {
      // Arrange
      let error: OrderError | undefined;

      // Act
      service.getOrder('order-123').subscribe({
        error: (e) => { error = e; }
      });

      httpMock.expectOne('/api/orders/order-123').flush(null, {
        status: 401,
        statusText: 'Unauthorized'
      });

      // Assert
      expect(error?.recoveryActions).toContain('LOGIN');
      expect(error?.recoveryActions).toContain('REFRESH_TOKEN');
    });

    it('should provide recovery actions for rate limiting', () => {
      // Arrange
      let error: OrderError | undefined;

      // Act
      service.getOrder('order-123').subscribe({
        error: (e) => { error = e; }
      });

      httpMock.expectOne('/api/orders/order-123').flush(null, {
        status: 429,
        statusText: 'Too Many Requests',
        headers: { 'Retry-After': '60' }
      });

      // Assert
      expect(error?.code).toBe(OrderErrorCode.RATE_LIMITED);
      expect(error?.retryAfterSeconds).toBe(60);
      expect(error?.recoveryActions).toContain('WAIT_AND_RETRY');
    });

    it('should clear error when user dismisses', () => {
      // Arrange - Put service in error state
      service.getOrder('order-123').subscribe({ error: () => {} });
      httpMock.expectOne('/api/orders/order-123').flush(null, {
        status: 500,
        statusText: 'Error'
      });
      expect(service.error()).not.toBeNull();

      // Act
      service.dismissError();

      // Assert
      expect(service.error()).toBeNull();
    });
  });

  // ============================================================
  // PATTERN 7: Concurrent Error Handling
  // ============================================================
  describe('concurrent requests', () => {
    it('should handle multiple simultaneous failures independently', () => {
      // Arrange
      const errors: OrderError[] = [];

      // Act - Start 3 concurrent requests
      service.getOrder('order-1').subscribe({
        error: (e) => errors.push(e)
      });
      service.getOrder('order-2').subscribe({
        error: (e) => errors.push(e)
      });
      service.getOrder('order-3').subscribe({
        error: (e) => errors.push(e)
      });

      // Fail with different errors
      httpMock.expectOne('/api/orders/order-1').flush(null, {
        status: 404,
        statusText: 'Not Found'
      });
      httpMock.expectOne('/api/orders/order-2').flush(null, {
        status: 500,
        statusText: 'Server Error'
      });
      httpMock.expectOne('/api/orders/order-3').flush(null, {
        status: 403,
        statusText: 'Forbidden'
      });

      // Assert - Each error is independent
      expect(errors).toHaveLength(3);
      expect(errors[0].code).toBe(OrderErrorCode.NOT_FOUND);
      expect(errors[1].code).toBe(OrderErrorCode.SERVER_ERROR);
      expect(errors[2].code).toBe(OrderErrorCode.AUTHORIZATION_ERROR);
    });

    it('should cancel pending requests on critical error', fakeAsync(() => {
      // Arrange
      let criticalError: OrderError | undefined;
      let otherCompleted = false;

      // Act - Start background refresh and critical operation
      service.refreshAllOrders().subscribe({
        complete: () => { otherCompleted = true; }
      });

      service.checkout().subscribe({
        error: (e) => { criticalError = e; }
      });

      // Critical operation fails with auth error
      httpMock.expectOne('/api/checkout').flush(null, {
        status: 401,
        statusText: 'Unauthorized'
      });

      // Assert - Background operations should be cancelled
      expect(criticalError?.code).toBe(OrderErrorCode.AUTHENTICATION_ERROR);
      expect(service.hasPendingRequests()).toBe(false);

      // Clean up
      httpMock.match(() => true).forEach(req => req.flush({}));
    }));
  });
});

/**
 * SUMMARY OF ERROR HANDLING PATTERNS:
 *
 * 1. Classify errors into typed error codes
 * 2. Test error state transitions (loading → error → cleared)
 * 3. Verify retry logic for transient errors
 * 4. Extract and test field-level validation errors
 * 5. Handle network errors (offline, timeout, DNS)
 * 6. Provide actionable recovery options
 * 7. Test concurrent error scenarios
 * 8. Ensure proper cleanup after errors
 */
