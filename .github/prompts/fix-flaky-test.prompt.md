---
description: "Diagnose and fix flaky tests by identifying timing issues, shared state, and non-deterministic patterns"
---

# Fix Flaky Test

Diagnose the root cause of test flakiness and apply deterministic patterns.

## Prerequisites

Reference the anti-patterns to identify flaky tests.

## Common Flaky Patterns & Fixes

| Anti-Pattern | Fix |
|--------------|-----|
| `setTimeout`/`setInterval` | Use `fakeAsync()` + `tick()` |
| Missing timer cleanup | Add `discardPeriodicTasks()` |
| `Promise.all` race | Control execution order |
| `Date.now()` | Mock with `jest.spyOn` |
| Shared component state | Reset in `beforeEach` |

**Correct Pattern**:
```typescript
it('handles debounced input', fakeAsync(() => {
  // Arrange
  const spy = jest.spyOn(service, 'search');

  // Act
  component.onInput('test');
  tick(300); // Advance past debounce

  // Assert
  expect(spy).toHaveBeenCalledWith('test');

  // Cleanup
  discardPeriodicTasks();
}));
```

**Reference**: `.golden-examples/async-patterns/`

## Diagnosis Steps

1. **Identify the failure pattern**:
   - Does it fail randomly? (timing issue)
   - Does it fail after other tests? (shared state)
   - Does it fail only in CI? (environment dependency)

2. **Run test in isolation**:
   ```bash
   npm test -- --testPathPattern="test-name" --runInBand
   ```

3. **Run multiple times to confirm flakiness**:
   ```bash
   for i in {1..10}; do npm test -- --testPathPattern="test-name"; done
   ```

## Output

1. Document the root cause
2. Show before/after code
3. Apply the fix
4. Verify with 5+ consecutive passes
