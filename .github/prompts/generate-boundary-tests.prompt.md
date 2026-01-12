---
description: "Generate boundary value tests using 7-point analysis for numeric limits, string lengths, and collection sizes"
---

# Generate Boundary Value Tests

Create thorough boundary tests using the 7-point analysis method.

## Prerequisites

Reference the boundary gaps in `#file:docs/TEST_ANALYSIS.md`.

## 7-Point Boundary Analysis

For each boundary, test these 7 values:

1. **min - 1** (invalid, just below minimum)
2. **min** (valid, at minimum)
3. **min + 1** (valid, just above minimum)
4. **typical** (valid, normal value)
5. **max - 1** (valid, just below maximum)
6. **max** (valid, at maximum)
7. **max + 1** (invalid, just above maximum)

## Instructions

### Document Boundaries as Constants

```typescript
const BOUNDARIES = {
  AMOUNT_MIN: 0.01,
  AMOUNT_MAX: 999999.99,
  QUANTITY_MIN: 1,
  QUANTITY_MAX: 9999,
  NAME_MIN_LENGTH: 1,
  NAME_MAX_LENGTH: 100,
} as const;
```

### Testing Pattern

```typescript
describe('amount validation', () => {
  test.each([
    [0, false, 'below minimum'],
    [0.01, true, 'at minimum'],
    [0.02, true, 'just above minimum'],
    [500, true, 'typical value'],
    [999999.98, true, 'just below maximum'],
    [999999.99, true, 'at maximum'],
    [1000000, false, 'above maximum'],
  ])('amount %s is valid=%s (%s)', (amount, expected, reason) => {
    expect(validator.isValidAmount(amount)).toBe(expected);
  });
});

// Include null/undefined/NaN handling
describe('handles edge cases', () => {
  test.each([
    [null, false, 'null'],
    [undefined, false, 'undefined'],
    [NaN, false, 'NaN'],
    [Infinity, false, 'Infinity'],
    [-Infinity, false, '-Infinity'],
    ['100', false, 'string number'],
  ])('rejects %s (%s)', (value, expected, reason) => {
    expect(validator.isValidAmount(value as any)).toBe(expected);
  });
});
```

**Reference**: `.golden-examples/boundary-testing/`

## Boundary Categories

1. **Numeric Values**: amounts, quantities, percentages, ages
2. **String Lengths**: names, descriptions, codes, identifiers
3. **Collection Sizes**: list items, array elements, batch sizes
4. **Date/Time**: past dates, future dates, time ranges
5. **Special Values**: null, empty, whitespace, zero

## Output

Generate tests that document boundaries as constants and test all 7 points for each boundary identified.
