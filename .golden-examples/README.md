# Golden Examples - Angular Testing Patterns

This folder contains **idempotent, best-practice test patterns** that serve as authoritative references for GitHub Copilot and workshop participants.

## Purpose

Golden Examples establish the **quality bar** for tests in this project. When generating or refactoring tests, Copilot should reference these patterns to ensure consistency, reliability, and maintainability.

## Directory Structure

```
.golden-examples/
├── parameterized-tests/      # test.each patterns for data-driven testing
├── http-mocking/             # HttpClientTestingModule patterns
├── signal-testing/           # Angular 19 signal testing patterns
├── error-handling/           # Exception and error state testing
├── boundary-testing/         # Edge cases and boundary value analysis
└── async-patterns/           # fakeAsync, tick, flush patterns
```

## How to Use These Examples

### For Copilot
Reference these examples in prompts:
```
@workspace Using the golden example in .golden-examples/parameterized-tests/,
refactor the email validation tests in user.service.spec.ts
```

### For Participants
1. **Study** the pattern before writing tests
2. **Critique** your existing tests against the golden example
3. **Apply** the pattern consistently

## Pattern Naming Convention

Each golden example follows this structure:
- **PATTERN**: Clear name of the testing pattern
- **WHEN TO USE**: Specific scenarios where this pattern applies
- **ANTI-PATTERNS**: What NOT to do (the problems this solves)
- **GOLDEN EXAMPLE**: The reference implementation
- **KEY PRINCIPLES**: The underlying testing philosophy

## Quality Criteria

All golden examples meet these standards:
- ✅ Deterministic (same result every run)
- ✅ Isolated (no shared mutable state)
- ✅ Fast (no real I/O, timers, or delays)
- ✅ Self-documenting (clear intent from test name)
- ✅ Single responsibility (one assertion concept per test)
- ✅ Follows Arrange-Act-Assert pattern
