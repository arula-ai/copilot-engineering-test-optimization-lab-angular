# GitHub Copilot Instructions - Test Optimization Lab (Angular)

> **Purpose**: This repository contains an Angular test optimization lab. This file configures GitHub Copilot to follow the Critique-then-Create methodology and reference Golden Examples.

---

## Core Methodology: Critique-then-Create

**ALWAYS follow this two-phase approach:**

### Phase 1: CRITIQUE (Analysis)
Before generating ANY test code:
1. Identify the component/service under test
2. Analyze existing test coverage
3. Identify anti-patterns and gaps
4. Document coverage gaps

### Phase 2: CREATE (Implementation)
After completing analysis:
1. Reference Golden Examples from `.golden-examples/` folder
2. Address identified gaps systematically
3. Follow established patterns for consistency

---

## Golden Examples Location
**Path**: `/.golden-examples/`

| Pattern | Location | Use For |
|---------|----------|---------|
| Parameterized Tests | `parameterized-tests/` | Multiple similar test cases |
| HTTP Mocking | `http-mocking/` | Service HTTP calls, error handling |
| Signal Testing | `signal-testing/` | Angular 19 signals, computed, effects |
| Async Patterns | `async-patterns/` | fakeAsync, timers, polling |
| Error Handling | `error-handling/` | Error states, retries |
| Boundary Testing | `boundary-testing/` | Min/max values, edge cases |

## Angular Testing Standards

### TestBed Configuration
```typescript
beforeEach(() => {
  TestBed.configureTestingModule({
    imports: [HttpClientTestingModule],
    providers: [ServiceUnderTest]
  });
  service = TestBed.inject(ServiceUnderTest);
  httpMock = TestBed.inject(HttpTestingController);
});

afterEach(() => {
  httpMock.verify(); // ALWAYS verify HTTP mocks
});
```

### Signal Testing
```typescript
expect(service.items()).toEqual([]);
service.addItem(item);
expect(service.items()).toContainEqual(item);
TestBed.flushEffects();
```

### Async Testing with fakeAsync
```typescript
it('should handle timers', fakeAsync(() => {
  service.startPolling();
  tick(5000);
  expect(service.data()).toBeDefined();
  flush();
  discardPeriodicTasks();
}));
```

### DO Generate for Angular:
- Parameterized tests with `test.each`
- HTTP error tests for all status codes (400, 401, 403, 404, 500, etc.)
- Signal state tests (initial, mutations, computed)
- fakeAsync for ALL timer operations

### DO NOT Generate for Angular:
- Real setTimeout in tests
- Tests without assertions
- Missing httpMock.verify()

---

## Prompt Format

```
@workspace [Action] [Target] [with specific requirements].

CRITIQUE CONTEXT:
[Analysis findings from Phase 1]

CREATE REQUIREMENTS:
Reference [specific Golden Example path]

Apply these patterns:
[Numbered list of specific patterns to use]

[Output format expectations]
```

---

*Remember: Quality comes from patterns. Patterns come from examples. Examples come from Golden Examples.*
