/**
 * GOLDEN EXAMPLE: Angular 19 Signal Testing Patterns
 *
 * PATTERN: Reactive State Testing with Signals
 *
 * WHEN TO USE:
 * - Testing signal-based state management in services
 * - Verifying computed signals update correctly
 * - Testing effect side-effects
 * - Component signal bindings
 *
 * ANTI-PATTERNS THIS SOLVES:
 * ❌ Not testing initial signal values
 * ❌ Missing computed signal derivation tests
 * ❌ Ignoring signal update propagation
 * ❌ Not testing effect triggers
 *
 * KEY PRINCIPLES:
 * 1. Test initial state of all signals
 * 2. Test state transitions explicitly
 * 3. Verify computed signals recalculate
 * 4. Use TestBed.flushEffects() for effect testing
 */

import { TestBed } from '@angular/core/testing';
import { signal, computed, effect } from '@angular/core';
import { CartService, CartItem } from './cart.service';

describe('CartService - Signal Testing Golden Example', () => {
  let service: CartService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CartService]
    });
    service = TestBed.inject(CartService);
  });

  // ============================================================
  // PATTERN 1: Testing Initial Signal State
  // ============================================================
  describe('initial state', () => {
    it('should initialize with empty cart', () => {
      // Signals are invoked as functions to read their value
      expect(service.items()).toEqual([]);
      expect(service.itemCount()).toBe(0);
      expect(service.total()).toBe(0);
      expect(service.isEmpty()).toBe(true);
    });

    it('should initialize loading state as false', () => {
      expect(service.isLoading()).toBe(false);
      expect(service.error()).toBeNull();
    });
  });

  // ============================================================
  // PATTERN 2: Testing Signal Updates
  // ============================================================
  describe('signal mutations', () => {
    it('should update items signal when adding item', () => {
      // Arrange
      const item: CartItem = {
        id: 'prod-1',
        name: 'Test Product',
        price: 29.99,
        quantity: 1
      };

      // Act
      service.addItem(item);

      // Assert - Read signal value
      expect(service.items()).toContainEqual(item);
      expect(service.items().length).toBe(1);
    });

    it('should increment quantity for existing item', () => {
      // Arrange
      const item: CartItem = {
        id: 'prod-1',
        name: 'Test Product',
        price: 29.99,
        quantity: 1
      };
      service.addItem(item);

      // Act - Add same item again
      service.addItem({ ...item });

      // Assert - Quantity should increase, not duplicate
      expect(service.items().length).toBe(1);
      expect(service.items()[0].quantity).toBe(2);
    });

    it('should update signal with set() for complete replacement', () => {
      // Arrange
      service.addItem({ id: '1', name: 'Item 1', price: 10, quantity: 1 });
      service.addItem({ id: '2', name: 'Item 2', price: 20, quantity: 1 });

      // Act - Clear cart (uses set([]))
      service.clearCart();

      // Assert
      expect(service.items()).toEqual([]);
      expect(service.isEmpty()).toBe(true);
    });

    it('should update signal with update() for partial changes', () => {
      // Arrange
      service.addItem({ id: '1', name: 'Item', price: 10, quantity: 1 });

      // Act - Update quantity (uses update())
      service.updateQuantity('1', 5);

      // Assert
      expect(service.items()[0].quantity).toBe(5);
    });
  });

  // ============================================================
  // PATTERN 3: Testing Computed Signals
  // ============================================================
  describe('computed signals', () => {
    it('should recalculate itemCount when items change', () => {
      // Initial state
      expect(service.itemCount()).toBe(0);

      // Add items
      service.addItem({ id: '1', name: 'A', price: 10, quantity: 2 });
      expect(service.itemCount()).toBe(2);

      service.addItem({ id: '2', name: 'B', price: 20, quantity: 3 });
      expect(service.itemCount()).toBe(5);

      // Remove item
      service.removeItem('1');
      expect(service.itemCount()).toBe(3);
    });

    it('should recalculate total based on items and quantities', () => {
      // Arrange & Act & Assert - Test progression
      expect(service.total()).toBe(0);

      service.addItem({ id: '1', name: 'A', price: 10.00, quantity: 2 });
      expect(service.total()).toBe(20.00);

      service.addItem({ id: '2', name: 'B', price: 15.50, quantity: 1 });
      expect(service.total()).toBe(35.50);

      service.updateQuantity('1', 1);
      expect(service.total()).toBe(25.50);
    });

    it('should update isEmpty based on items array', () => {
      expect(service.isEmpty()).toBe(true);

      service.addItem({ id: '1', name: 'A', price: 10, quantity: 1 });
      expect(service.isEmpty()).toBe(false);

      service.removeItem('1');
      expect(service.isEmpty()).toBe(true);
    });

    it('should calculate derived state with multiple dependencies', () => {
      // Computed signal that depends on multiple other signals
      // e.g., canCheckout = computed(() => !isEmpty() && !isLoading() && !error())

      expect(service.canCheckout()).toBe(false); // Empty cart

      service.addItem({ id: '1', name: 'A', price: 10, quantity: 1 });
      expect(service.canCheckout()).toBe(true);

      // Simulate loading state
      service.setLoading(true);
      expect(service.canCheckout()).toBe(false);

      service.setLoading(false);
      expect(service.canCheckout()).toBe(true);
    });
  });

  // ============================================================
  // PATTERN 4: Testing Signal Equality and Change Detection
  // ============================================================
  describe('signal change detection', () => {
    it('should not trigger update for identical values', () => {
      // Arrange
      let updateCount = 0;
      const originalItems = service.items();

      // Track updates (in real code, you'd use effect())
      const trackUpdates = () => {
        updateCount++;
        return service.items();
      };

      // Act - Set to same value
      service.setItems([...originalItems]);

      // Assert - Depending on signal implementation,
      // identical arrays may or may not trigger updates
      // Test your specific equality behavior
    });

    it('should detect nested object changes', () => {
      // Arrange
      service.addItem({ id: '1', name: 'Original', price: 10, quantity: 1 });

      // Act - Update nested property
      service.updateItemName('1', 'Updated');

      // Assert
      expect(service.items()[0].name).toBe('Updated');
    });
  });

  // ============================================================
  // PATTERN 5: Testing Signals with Async Operations
  // ============================================================
  describe('async signal updates', () => {
    it('should update loading signal during async operation', async () => {
      // Initial state
      expect(service.isLoading()).toBe(false);

      // Start async operation
      const promise = service.loadCartFromServer();
      expect(service.isLoading()).toBe(true);

      // Complete operation
      await promise;
      expect(service.isLoading()).toBe(false);
    });

    it('should update error signal on failure', async () => {
      // Arrange
      expect(service.error()).toBeNull();

      // Act - Trigger failure
      try {
        await service.loadCartFromServer('invalid-user');
      } catch {
        // Expected
      }

      // Assert
      expect(service.error()).not.toBeNull();
      expect(service.isLoading()).toBe(false);
    });

    it('should clear error on successful retry', async () => {
      // Arrange - Set error state
      service.setError('Previous error');
      expect(service.error()).toBe('Previous error');

      // Act - Successful operation
      await service.loadCartFromServer('valid-user');

      // Assert
      expect(service.error()).toBeNull();
    });
  });

  // ============================================================
  // PATTERN 6: Testing Effects (Side Effects)
  // ============================================================
  describe('signal effects', () => {
    it('should trigger persistence effect when items change', () => {
      // Arrange
      const persistSpy = jest.spyOn(service, 'persistToLocalStorage');

      // Act
      service.addItem({ id: '1', name: 'A', price: 10, quantity: 1 });

      // Flush effects to ensure they run
      TestBed.flushEffects();

      // Assert
      expect(persistSpy).toHaveBeenCalled();
    });

    it('should trigger analytics effect on checkout', () => {
      // Arrange
      const analyticsSpy = jest.spyOn(service, 'trackCheckoutStarted');
      service.addItem({ id: '1', name: 'A', price: 10, quantity: 1 });

      // Act
      service.startCheckout();
      TestBed.flushEffects();

      // Assert
      expect(analyticsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          itemCount: 1,
          total: 10
        })
      );
    });
  });

  // ============================================================
  // PATTERN 7: Component Signal Binding Testing
  // ============================================================
  describe('component integration', () => {
    it('should expose signals for template binding', () => {
      // Verify signals are accessible and typed correctly
      expect(typeof service.items).toBe('function');
      expect(typeof service.total).toBe('function');
      expect(typeof service.isLoading).toBe('function');

      // Verify return types
      expect(Array.isArray(service.items())).toBe(true);
      expect(typeof service.total()).toBe('number');
      expect(typeof service.isLoading()).toBe('boolean');
    });
  });
});

/**
 * SUMMARY OF SIGNAL TESTING PATTERNS:
 *
 * 1. Always test initial signal state
 * 2. Test both set() and update() mutations
 * 3. Verify computed signals recalculate on dependencies
 * 4. Test async operations with loading/error signals
 * 5. Use TestBed.flushEffects() for effect testing
 * 6. Test signal equality behavior for your use case
 * 7. Verify signals are properly typed for templates
 */
