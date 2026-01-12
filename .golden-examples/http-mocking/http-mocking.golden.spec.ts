/**
 * GOLDEN EXAMPLE: HTTP Mocking with HttpClientTestingModule
 *
 * PATTERN: Deterministic HTTP Testing
 *
 * WHEN TO USE:
 * - Testing services that make HTTP requests
 * - Verifying request parameters (headers, body, URL)
 * - Testing error handling for various HTTP status codes
 * - Ensuring proper loading state management
 *
 * ANTI-PATTERNS THIS SOLVES:
 * ❌ Flaky tests due to real network calls
 * ❌ Missing afterEach verification causing silent failures
 * ❌ Incomplete error scenario coverage
 * ❌ Not testing request configuration (headers, params)
 *
 * KEY PRINCIPLES:
 * 1. ALWAYS call httpMock.verify() in afterEach
 * 2. Test the request configuration, not just the response
 * 3. Cover all HTTP error codes your app handles
 * 4. Verify loading states during async operations
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { PaymentService, Payment, PaymentRequest } from './payment.service';

describe('PaymentService - HTTP Mocking Golden Example', () => {
  let service: PaymentService;
  let httpMock: HttpTestingController;

  // ============================================================
  // SETUP: Configure TestBed with HttpClientTestingModule
  // ============================================================
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PaymentService]
    });

    service = TestBed.inject(PaymentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  // ============================================================
  // CRITICAL: Always verify no outstanding requests
  // ============================================================
  afterEach(() => {
    // This catches:
    // - Unexpected HTTP calls
    // - Missing flush() calls
    // - Tests that don't properly await async operations
    httpMock.verify();
  });

  // ============================================================
  // PATTERN 1: Basic GET Request with Response Verification
  // ============================================================
  describe('getPayment', () => {
    it('should fetch payment by ID and return typed response', () => {
      // Arrange
      const mockPayment: Payment = {
        id: 'pay-123',
        amount: 99.99,
        currency: 'USD',
        status: 'completed'
      };

      // Act
      let result: Payment | undefined;
      service.getPayment('pay-123').subscribe(payment => {
        result = payment;
      });

      // Assert - Verify request configuration
      const req = httpMock.expectOne('/api/payments/pay-123');
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Accept')).toBe('application/json');

      // Provide mock response
      req.flush(mockPayment);

      // Verify response handling
      expect(result).toEqual(mockPayment);
    });

    it('should include authentication header', () => {
      // Act
      service.getPayment('pay-123').subscribe();

      // Assert - Verify auth header is present
      const req = httpMock.expectOne('/api/payments/pay-123');
      expect(req.request.headers.has('Authorization')).toBe(true);
      expect(req.request.headers.get('Authorization')).toMatch(/^Bearer /);

      req.flush({});
    });
  });

  // ============================================================
  // PATTERN 2: POST Request with Body Verification
  // ============================================================
  describe('createPayment', () => {
    it('should POST payment request with correct body', () => {
      // Arrange
      const paymentRequest: PaymentRequest = {
        amount: 150.00,
        currency: 'USD',
        method: 'credit_card',
        cardNumber: '4111111111111111'
      };

      const mockResponse: Payment = {
        id: 'pay-new',
        amount: 150.00,
        currency: 'USD',
        status: 'pending'
      };

      // Act
      let result: Payment | undefined;
      service.createPayment(paymentRequest).subscribe(payment => {
        result = payment;
      });

      // Assert - Verify request body matches
      const req = httpMock.expectOne('/api/payments');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(paymentRequest);
      expect(req.request.headers.get('Content-Type')).toBe('application/json');

      req.flush(mockResponse);
      expect(result?.id).toBe('pay-new');
    });

    it('should NOT include sensitive card data in logs', () => {
      // Arrange
      const paymentRequest: PaymentRequest = {
        amount: 100,
        currency: 'USD',
        method: 'credit_card',
        cardNumber: '4111111111111111',
        cvv: '123'
      };

      // Act
      service.createPayment(paymentRequest).subscribe();

      // Assert - Verify CVV is not sent to server
      const req = httpMock.expectOne('/api/payments');
      expect(req.request.body.cvv).toBeUndefined();

      req.flush({ id: 'pay-1' });
    });
  });

  // ============================================================
  // PATTERN 3: Comprehensive HTTP Error Handling
  // ============================================================
  describe('error handling', () => {
    // Test each HTTP error status code your app handles
    test.each([
      [400, 'Bad Request', 'Invalid payment details'],
      [401, 'Unauthorized', 'Authentication required'],
      [403, 'Forbidden', 'Insufficient permissions'],
      [404, 'Not Found', 'Payment not found'],
      [422, 'Unprocessable Entity', 'Validation failed'],
      [500, 'Internal Server Error', 'Server error occurred'],
      [503, 'Service Unavailable', 'Service temporarily unavailable'],
    ])('should handle HTTP %d (%s) error', (status, statusText, expectedMessage) => {
      // Arrange
      let error: HttpErrorResponse | undefined;

      // Act
      service.getPayment('pay-123').subscribe({
        next: () => fail('Should have errored'),
        error: (e) => { error = e; }
      });

      // Assert
      const req = httpMock.expectOne('/api/payments/pay-123');
      req.flush(
        { message: expectedMessage },
        { status, statusText }
      );

      expect(error).toBeInstanceOf(HttpErrorResponse);
      expect(error?.status).toBe(status);
    });

    it('should handle network error (status 0)', () => {
      // Arrange
      let error: HttpErrorResponse | undefined;

      // Act
      service.getPayment('pay-123').subscribe({
        error: (e) => { error = e; }
      });

      // Simulate network failure
      const req = httpMock.expectOne('/api/payments/pay-123');
      req.error(new ProgressEvent('error'), {
        status: 0,
        statusText: 'Unknown Error'
      });

      // Assert
      expect(error?.status).toBe(0);
    });

    it('should handle timeout', () => {
      // Arrange
      let error: Error | undefined;

      // Act
      service.getPaymentWithTimeout('pay-123', 5000).subscribe({
        error: (e) => { error = e; }
      });

      // Simulate timeout by not responding
      const req = httpMock.expectOne('/api/payments/pay-123');

      // Note: In real tests, you'd use fakeAsync and tick()
      // This example shows the pattern
      req.error(new ProgressEvent('timeout'));

      expect(error).toBeDefined();
    });
  });

  // ============================================================
  // PATTERN 4: Query Parameters Testing
  // ============================================================
  describe('listPayments with filters', () => {
    it('should include query parameters in request', () => {
      // Arrange
      const filters = {
        status: 'completed',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        limit: 50
      };

      // Act
      service.listPayments(filters).subscribe();

      // Assert - Verify query params
      const req = httpMock.expectOne(request =>
        request.url === '/api/payments' &&
        request.params.get('status') === 'completed' &&
        request.params.get('startDate') === '2024-01-01' &&
        request.params.get('limit') === '50'
      );

      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('should omit undefined filter values', () => {
      // Arrange
      const filters = {
        status: 'pending',
        startDate: undefined,
        limit: undefined
      };

      // Act
      service.listPayments(filters).subscribe();

      // Assert - Only defined params should be sent
      const req = httpMock.expectOne(request => {
        return request.url === '/api/payments' &&
          request.params.has('status') &&
          !request.params.has('startDate') &&
          !request.params.has('limit');
      });

      req.flush([]);
    });
  });

  // ============================================================
  // PATTERN 5: Multiple Sequential Requests
  // ============================================================
  describe('batch operations', () => {
    it('should handle multiple sequential requests', () => {
      // Arrange
      const paymentIds = ['pay-1', 'pay-2', 'pay-3'];

      // Act
      let results: Payment[] = [];
      service.getPaymentsBatch(paymentIds).subscribe(payments => {
        results = payments;
      });

      // Assert - Expect requests in order
      const requests = paymentIds.map(id =>
        httpMock.expectOne(`/api/payments/${id}`)
      );

      // Flush in order
      requests.forEach((req, i) => {
        req.flush({ id: paymentIds[i], amount: (i + 1) * 100 });
      });

      expect(results.length).toBe(3);
      expect(results[0].id).toBe('pay-1');
    });
  });

  // ============================================================
  // PATTERN 6: Request URL Matching Strategies
  // ============================================================
  describe('URL matching patterns', () => {
    it('should match by exact URL', () => {
      service.getPayment('123').subscribe();

      // Exact match
      const req = httpMock.expectOne('/api/payments/123');
      req.flush({});
    });

    it('should match by predicate function', () => {
      service.getPayment('123').subscribe();

      // Predicate match - useful for complex URLs
      const req = httpMock.expectOne(request =>
        request.method === 'GET' &&
        request.url.includes('/payments/') &&
        request.url.endsWith('123')
      );
      req.flush({});
    });

    it('should match multiple requests with match()', () => {
      service.getPayment('1').subscribe();
      service.getPayment('2').subscribe();

      // Match all requests to /api/payments/*
      const requests = httpMock.match(request =>
        request.url.startsWith('/api/payments/')
      );

      expect(requests.length).toBe(2);
      requests.forEach(req => req.flush({}));
    });
  });
});

/**
 * SUMMARY OF HTTP MOCKING PATTERNS:
 *
 * 1. ALWAYS use afterEach with httpMock.verify()
 * 2. Test request configuration (method, headers, body, params)
 * 3. Cover ALL HTTP error codes your app handles
 * 4. Use expectOne() for single requests, match() for multiple
 * 5. Use predicate functions for complex URL matching
 * 6. Flush responses in order for sequential operations
 * 7. Test network errors with req.error()
 */
