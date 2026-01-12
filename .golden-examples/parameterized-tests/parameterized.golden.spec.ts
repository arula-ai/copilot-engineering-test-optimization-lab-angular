/**
 * GOLDEN EXAMPLE: Parameterized Testing with Jest test.each
 *
 * PATTERN: Data-Driven Testing
 *
 * WHEN TO USE:
 * - Multiple test cases with identical logic but different inputs/outputs
 * - Validation functions with many edge cases
 * - Reducing test code duplication while maintaining coverage
 *
 * ANTI-PATTERNS THIS SOLVES:
 * ❌ Copy-pasted tests with only data differences
 * ❌ Long test files with repetitive structure
 * ❌ Inconsistent test naming across similar cases
 * ❌ Missing edge cases due to test fatigue
 *
 * KEY PRINCIPLES:
 * 1. Group related test cases by behavior category
 * 2. Use descriptive test names with %s placeholders
 * 3. Include boundary values and edge cases in test data
 * 4. Document WHY each test case exists
 */

import { TestBed } from '@angular/core/testing';
import { ValidationService } from './validation.service';

describe('ValidationService - Parameterized Golden Example', () => {
  let service: ValidationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ValidationService]
    });
    service = TestBed.inject(ValidationService);
  });

  // ============================================================
  // PATTERN 1: Simple Boolean Validation with test.each
  // ============================================================
  describe('isValidEmail', () => {
    // Group: Valid email formats
    test.each([
      ['user@example.com', 'standard format'],
      ['user.name@example.com', 'with dot in local part'],
      ['user+tag@example.com', 'with plus addressing'],
      ['user@subdomain.example.com', 'with subdomain'],
      ['a@b.co', 'minimum valid length'],
    ])('should accept "%s" (%s)', (email, _description) => {
      expect(service.isValidEmail(email)).toBe(true);
    });

    // Group: Invalid email formats
    test.each([
      ['', 'empty string'],
      ['invalid', 'missing @ symbol'],
      ['@example.com', 'missing local part'],
      ['user@', 'missing domain'],
      ['user@.com', 'missing domain name'],
      ['user space@example.com', 'space in local part'],
      ['user@@example.com', 'double @ symbol'],
    ])('should reject "%s" (%s)', (email, _description) => {
      expect(service.isValidEmail(email)).toBe(false);
    });

    // Group: Boundary cases
    test.each([
      [null, 'null input'],
      [undefined, 'undefined input'],
    ])('should handle %s gracefully', (email, _description) => {
      expect(service.isValidEmail(email as any)).toBe(false);
    });
  });

  // ============================================================
  // PATTERN 2: Validation with Error Messages
  // ============================================================
  describe('validatePassword', () => {
    // Group: Invalid passwords with specific error messages
    test.each([
      ['short', 'Password must be at least 8 characters', 'too short'],
      ['alllowercase1!', 'Password must contain uppercase', 'no uppercase'],
      ['ALLUPPERCASE1!', 'Password must contain lowercase', 'no lowercase'],
      ['NoNumbers!!', 'Password must contain a number', 'no numbers'],
      ['NoSpecial123', 'Password must contain special character', 'no special'],
    ])('should reject "%s" with message "%s" (%s)', (password, expectedError, _reason) => {
      const result = service.validatePassword(password);

      expect(result.valid).toBe(false);
      expect(result.error).toContain(expectedError);
    });

    // Group: Valid passwords
    test.each([
      ['ValidPass1!', 'standard valid password'],
      ['C0mpl3x!Pass', 'complex valid password'],
      ['A1!bcdef', 'minimum requirements met'],
    ])('should accept "%s" (%s)', (password, _description) => {
      const result = service.validatePassword(password);

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  // ============================================================
  // PATTERN 3: Numeric Boundary Testing
  // ============================================================
  describe('validateAmount', () => {
    const MIN_AMOUNT = 0.01;
    const MAX_AMOUNT = 1_000_000;

    // Group: Valid amounts (including boundaries)
    test.each([
      [MIN_AMOUNT, 'minimum valid amount'],
      [1.00, 'typical small amount'],
      [100.00, 'typical medium amount'],
      [MAX_AMOUNT, 'maximum valid amount'],
      [MAX_AMOUNT - 0.01, 'just below maximum'],
    ])('should accept $%d (%s)', (amount, _description) => {
      expect(service.validateAmount(amount)).toEqual({
        valid: true,
        error: null
      });
    });

    // Group: Invalid amounts (boundary violations)
    test.each([
      [0, 'zero'],
      [-1, 'negative'],
      [-0.01, 'small negative'],
      [MIN_AMOUNT - 0.001, 'below minimum'],
      [MAX_AMOUNT + 0.01, 'above maximum'],
      [Infinity, 'infinity'],
      [NaN, 'NaN'],
    ])('should reject %d (%s)', (amount, _description) => {
      expect(service.validateAmount(amount).valid).toBe(false);
    });
  });

  // ============================================================
  // PATTERN 4: Enum-Based Testing
  // ============================================================
  describe('getPaymentFee', () => {
    test.each([
      ['credit_card', 2.9, 'highest fee'],
      ['debit_card', 1.5, 'medium fee'],
      ['bank_transfer', 0.5, 'low fee'],
      ['wallet', 0, 'no fee'],
    ] as const)('should return %d%% fee for %s (%s)', (method, expectedFee, _description) => {
      const fee = service.getPaymentFee(method);
      expect(fee).toBe(expectedFee);
    });
  });

  // ============================================================
  // PATTERN 5: Object Transformation Testing
  // ============================================================
  describe('formatCurrency', () => {
    test.each([
      [100, 'USD', '$100.00', 'US dollars'],
      [100, 'EUR', '€100.00', 'Euros'],
      [100, 'GBP', '£100.00', 'British pounds'],
      [1234.56, 'USD', '$1,234.56', 'with thousands separator'],
      [0.99, 'USD', '$0.99', 'cents only'],
    ])('should format %d %s as "%s" (%s)', (amount, currency, expected, _description) => {
      expect(service.formatCurrency(amount, currency)).toBe(expected);
    });
  });
});

/**
 * SUMMARY OF PATTERNS:
 *
 * 1. Use test.each with descriptive arrays
 * 2. Include a description parameter (even if unused) for documentation
 * 3. Group tests by behavior (valid/invalid/boundary)
 * 4. Use %s, %d placeholders for dynamic test names
 * 5. Keep test data close to the test for readability
 * 6. Include constants for magic numbers (MIN_AMOUNT, MAX_AMOUNT)
 */
