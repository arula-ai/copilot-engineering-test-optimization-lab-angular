---
description: "Generate comprehensive error handling tests for HTTP errors and validation failures"
---

# Generate Error Handling Tests

Create thorough tests for all error paths and exception scenarios.

## Prerequisites

Reference the error handling gaps to identify missing tests.

## Instructions

### HTTP Error Tests

Generate tests for all HTTP status codes using `test.each`:

```typescript
describe('error handling', () => {
  test.each([
    [400, 'Bad Request', 'VALIDATION_ERROR'],
    [401, 'Unauthorized', 'AUTH_ERROR'],
    [403, 'Forbidden', 'FORBIDDEN_ERROR'],
    [404, 'Not Found', 'NOT_FOUND_ERROR'],
    [422, 'Unprocessable Entity', 'VALIDATION_ERROR'],
    [500, 'Internal Server Error', 'SERVER_ERROR'],
    [502, 'Bad Gateway', 'SERVER_ERROR'],
    [503, 'Service Unavailable', 'SERVICE_UNAVAILABLE'],
    [0, 'Network Error', 'NETWORK_ERROR'],
  ])('handles HTTP %i %s', (status, statusText, expectedCode) => {
    // Arrange
    service.fetchData();

    // Act
    httpMock.expectOne(expectedUrl).flush(
      { message: statusText },
      { status, statusText }
    );

    // Assert
    expect(service.error()).toEqual(
      expect.objectContaining({ code: expectedCode })
    );
  });
});
```

**Reference**: `.golden-examples/http-mocking/` and `.golden-examples/error-handling/`

## Error Categories to Cover

1. **Validation Errors**: Invalid input, missing required fields, format errors
2. **Authentication Errors**: Invalid credentials, expired tokens, missing auth
3. **Authorization Errors**: Forbidden access, insufficient permissions
4. **Not Found Errors**: Missing resources, invalid IDs
5. **Server Errors**: Internal errors, timeouts, unavailable services
6. **Network Errors**: Connection failures, DNS errors, timeouts

## Output

Generate test file additions that cover all identified error paths.
