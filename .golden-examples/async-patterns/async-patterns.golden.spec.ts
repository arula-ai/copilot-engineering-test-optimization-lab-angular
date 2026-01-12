/**
 * GOLDEN EXAMPLE: Async Testing Patterns with fakeAsync
 *
 * PATTERN: Deterministic Async Testing
 *
 * WHEN TO USE:
 * - Testing setTimeout, setInterval operations
 * - Testing debounced/throttled functions
 * - Testing polling mechanisms
 * - Testing race conditions deterministically
 *
 * ANTI-PATTERNS THIS SOLVES:
 * ❌ Flaky tests due to real timers
 * ❌ Tests hanging from unflushed timers
 * ❌ Race conditions in concurrent operations
 * ❌ Using setTimeout in tests (NEVER do this)
 *
 * KEY PRINCIPLES:
 * 1. Use fakeAsync() for ALL timer-based tests
 * 2. Always call flush() or discardPeriodicTasks() at end
 * 3. Use tick() to advance virtual time precisely
 * 4. Never use real setTimeout in tests
 */

import { TestBed, fakeAsync, tick, flush, discardPeriodicTasks } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AutoRefreshService } from './auto-refresh.service';
import { PollingService } from './polling.service';

describe('Async Patterns - Golden Example', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AutoRefreshService, PollingService]
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ============================================================
  // PATTERN 1: Testing setTimeout with fakeAsync
  // ============================================================
  describe('delayed operations', () => {
    it('should execute callback after delay', fakeAsync(() => {
      // Arrange
      const service = TestBed.inject(AutoRefreshService);
      let executed = false;

      // Act
      service.executeAfterDelay(() => {
        executed = true;
      }, 1000);

      // Assert - Before delay
      expect(executed).toBe(false);

      // Advance time by 999ms
      tick(999);
      expect(executed).toBe(false);

      // Advance to exactly 1000ms
      tick(1);
      expect(executed).toBe(true);
    }));

    it('should cancel delayed operation', fakeAsync(() => {
      // Arrange
      const service = TestBed.inject(AutoRefreshService);
      let executed = false;

      // Act
      const cancelFn = service.executeAfterDelay(() => {
        executed = true;
      }, 1000);

      // Cancel before execution
      tick(500);
      cancelFn();

      // Advance past delay
      tick(1000);

      // Assert - Should NOT have executed
      expect(executed).toBe(false);

      // Clean up any remaining timers
      flush();
    }));
  });

  // ============================================================
  // PATTERN 2: Testing setInterval with fakeAsync
  // ============================================================
  describe('polling operations', () => {
    it('should poll at specified interval', fakeAsync(() => {
      // Arrange
      const service = TestBed.inject(PollingService);
      let pollCount = 0;

      // Act - Start polling every 5 seconds
      service.startPolling(() => {
        pollCount++;
      }, 5000);

      // Assert - Initial call
      expect(pollCount).toBe(1);

      // Advance through intervals
      tick(5000);
      expect(pollCount).toBe(2);

      tick(5000);
      expect(pollCount).toBe(3);

      tick(5000);
      expect(pollCount).toBe(4);

      // CRITICAL: Must stop polling and discard periodic tasks
      service.stopPolling();
      discardPeriodicTasks();
    }));

    it('should stop polling when requested', fakeAsync(() => {
      // Arrange
      const service = TestBed.inject(PollingService);
      let pollCount = 0;

      // Act
      service.startPolling(() => pollCount++, 1000);

      tick(3000);
      expect(pollCount).toBe(4); // Initial + 3 intervals

      // Stop polling
      service.stopPolling();

      // Advance more time
      tick(5000);

      // Assert - Count should not increase
      expect(pollCount).toBe(4);

      // Clean up
      discardPeriodicTasks();
    }));
  });

  // ============================================================
  // PATTERN 3: Testing Debounce
  // ============================================================
  describe('debounced operations', () => {
    it('should debounce rapid calls', fakeAsync(() => {
      // Arrange
      const service = TestBed.inject(AutoRefreshService);
      let callCount = 0;
      const debouncedFn = service.debounce(() => callCount++, 300);

      // Act - Rapid calls
      debouncedFn();
      debouncedFn();
      debouncedFn();
      debouncedFn();

      // Assert - Nothing executed yet
      expect(callCount).toBe(0);

      // Advance past debounce delay
      tick(300);
      expect(callCount).toBe(1); // Only one call

      flush();
    }));

    it('should reset debounce on new call', fakeAsync(() => {
      // Arrange
      const service = TestBed.inject(AutoRefreshService);
      let callCount = 0;
      const debouncedFn = service.debounce(() => callCount++, 300);

      // Act - Call, wait, call again
      debouncedFn();
      tick(200); // Less than debounce delay
      debouncedFn(); // Reset timer
      tick(200); // Still not enough total
      expect(callCount).toBe(0);

      tick(100); // Now 300ms since last call
      expect(callCount).toBe(1);

      flush();
    }));
  });

  // ============================================================
  // PATTERN 4: Testing HTTP with Timers
  // ============================================================
  describe('auto-refresh with HTTP', () => {
    it('should refresh data at interval', fakeAsync(() => {
      // Arrange
      const service = TestBed.inject(AutoRefreshService);
      service.enableAutoRefresh(10000);

      // Initial request
      const req1 = httpMock.expectOne('/api/data');
      req1.flush({ version: 1 });
      expect(service.data()?.version).toBe(1);

      // Advance to first refresh
      tick(10000);
      const req2 = httpMock.expectOne('/api/data');
      req2.flush({ version: 2 });
      expect(service.data()?.version).toBe(2);

      // Advance to second refresh
      tick(10000);
      const req3 = httpMock.expectOne('/api/data');
      req3.flush({ version: 3 });
      expect(service.data()?.version).toBe(3);

      // Cleanup
      service.disableAutoRefresh();
      discardPeriodicTasks();
    }));

    it('should handle refresh errors gracefully', fakeAsync(() => {
      // Arrange
      const service = TestBed.inject(AutoRefreshService);
      service.enableAutoRefresh(5000);

      // Initial success
      httpMock.expectOne('/api/data').flush({ version: 1 });

      // Refresh fails
      tick(5000);
      httpMock.expectOne('/api/data').flush(null, {
        status: 500,
        statusText: 'Server Error'
      });

      // Should still have old data
      expect(service.data()?.version).toBe(1);
      expect(service.error()).not.toBeNull();

      // Next refresh succeeds
      tick(5000);
      httpMock.expectOne('/api/data').flush({ version: 2 });
      expect(service.data()?.version).toBe(2);
      expect(service.error()).toBeNull();

      service.disableAutoRefresh();
      discardPeriodicTasks();
    }));
  });

  // ============================================================
  // PATTERN 5: flush() vs tick() vs discardPeriodicTasks()
  // ============================================================
  describe('timer control comparison', () => {
    it('tick() advances time by specific amount', fakeAsync(() => {
      let result = '';
      setTimeout(() => result += 'A', 100);
      setTimeout(() => result += 'B', 200);
      setTimeout(() => result += 'C', 300);

      tick(100);
      expect(result).toBe('A');

      tick(100);
      expect(result).toBe('AB');

      tick(100);
      expect(result).toBe('ABC');
    }));

    it('flush() completes ALL pending timers', fakeAsync(() => {
      let result = '';
      setTimeout(() => result += 'A', 100);
      setTimeout(() => result += 'B', 200);
      setTimeout(() => result += 'C', 300);

      // Complete all at once
      flush();
      expect(result).toBe('ABC');
    }));

    it('discardPeriodicTasks() cleans up intervals', fakeAsync(() => {
      let count = 0;
      const id = setInterval(() => count++, 100);

      tick(350);
      expect(count).toBe(3);

      // This would hang without discardPeriodicTasks
      // because the interval never stops
      clearInterval(id);
      discardPeriodicTasks();
    }));
  });

  // ============================================================
  // PATTERN 6: Testing Race Conditions
  // ============================================================
  describe('race condition handling', () => {
    it('should cancel stale request when new request starts', fakeAsync(() => {
      // Arrange
      const service = TestBed.inject(AutoRefreshService);

      // Act - Start first request
      service.loadData('query1');

      // Start second request before first completes
      tick(50);
      service.loadData('query2');

      // First request completes (stale)
      const req1 = httpMock.expectOne('/api/data?q=query1');
      req1.flush({ result: 'stale' });

      // Second request completes
      const req2 = httpMock.expectOne('/api/data?q=query2');
      req2.flush({ result: 'current' });

      // Assert - Should have second result, not first
      expect(service.data()?.result).toBe('current');

      flush();
    }));

    it('should handle out-of-order responses correctly', fakeAsync(() => {
      // Arrange
      const service = TestBed.inject(AutoRefreshService);

      // Act - Start two requests
      service.loadData('slow');
      tick(10);
      service.loadData('fast');

      // Fast request (second) completes first
      const req2 = httpMock.expectOne('/api/data?q=fast');
      req2.flush({ result: 'fast' });

      // Slow request (first) completes later
      const req1 = httpMock.expectOne('/api/data?q=slow');
      req1.flush({ result: 'slow' });

      // Assert - Should ignore the stale slow response
      expect(service.data()?.result).toBe('fast');

      flush();
    }));
  });
});

/**
 * SUMMARY OF ASYNC TESTING PATTERNS:
 *
 * 1. ALWAYS wrap timer tests in fakeAsync()
 * 2. Use tick(ms) for precise time control
 * 3. Use flush() to complete all pending timers
 * 4. Use discardPeriodicTasks() for setInterval cleanup
 * 5. NEVER use real setTimeout in tests
 * 6. Test race conditions with controlled timing
 * 7. Always cleanup: stopPolling, cancelSubscriptions, etc.
 */
