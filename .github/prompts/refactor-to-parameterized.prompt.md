---
description: "Refactor redundant tests to use test.each for Jest"
---

# Refactor Redundant Tests to Parameterized

Convert repetitive test patterns into concise, maintainable parameterized tests.

## Prerequisites

Reference the analysis to identify redundant tests.

## Instructions

1. **Identify redundant patterns**:
   - Multiple `it()` blocks with identical structure
   - Only test data differs between tests

2. **Convert to test.each**:
   ```typescript
   // Before: 6 separate tests
   it('validates valid@email.com', () => { ... });
   it('validates user@domain.org', () => { ... });

   // After: 1 parameterized test
   test.each([
     ['valid@email.com', true, 'standard format'],
     ['user@domain.org', true, 'org domain'],
     ['invalid', false, 'missing @'],
   ])('validates "%s" as %s (%s)', (email, expected, reason) => {
     expect(validator.isValid(email)).toBe(expected);
   });
   ```

3. **Reference pattern**: `.golden-examples/parameterized-tests/`

## Target

Reduce line count by **50% or more** while maintaining full test coverage.

## Output

Apply refactoring to the identified test file and verify tests still pass.
