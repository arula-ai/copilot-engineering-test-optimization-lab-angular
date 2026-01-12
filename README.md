# Test Optimization Lab - Angular

Hands-on lab for improving test coverage using GitHub Copilot with the Critique-then-Create methodology.

## Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Angular** | 19 | Frontend Framework |
| **TypeScript** | Latest | Programming Language |
| **Jest** | Latest | Testing Framework |
| **Testing Library** | Latest | Test Utilities |

This lab uses an e-commerce domain (payments, orders, users, inventory) with intentionally weak test coverage (~30-40%) for you to analyze and improve.

## What You'll Do

| Stage | Focus | Outcome |
|-------|-------|---------|
| **Stage 1** | Coverage Gap Analysis | Analysis with prioritized findings |
| **Stage 2** | Test Enhancement | Refactored tests, +15% coverage |
| **Stage 3** | Quality Gates | Jenkins pipeline with SonarQube integration |

## Quick Start

```bash
npm install
npm test
npm run test:coverage
open coverage/lcov-report/index.html
```

## Custom Agents & Prompts

Located in `.github/agents/` and `.github/prompts/`:

| Agent/Prompt | Purpose |
|--------------|---------|
| **Test Critique Agent** | Analyze coverage gaps, identify anti-patterns |
| **Test Create Agent** | Generate tests from analysis |
| **Test Quality Gate Agent** | Configure Jenkins/SonarQube |
| `/coverage-analysis` | Quick coverage gap analysis |
| `/refactor-to-parameterized` | Convert to `test.each` |
| `/fix-flaky-test` | Diagnose timing issues |
| `/generate-error-tests` | HTTP error and exception tests |
| `/generate-boundary-tests` | 7-point boundary value tests |

## Issues to Find & Fix

| Issue Type | File |
|------------|------|
| Weak coverage (~35%) | `payment.service.spec.ts` |
| Redundant tests | `user.service.spec.ts` |
| Flaky async tests | `order.service.spec.ts` |
| Missing tests | `notification.service` (no tests) |

## Golden Examples

Reference implementations in `.golden-examples/`:

- `parameterized-tests/` - `test.each` patterns
- `http-mocking/` - HttpClientTestingModule patterns
- `async-patterns/` - `fakeAsync`/`tick` tests
- `error-handling/` - Exception and HTTP error tests
- `boundary-testing/` - 7-point boundary analysis
- `signal-testing/` - Angular 19 signal tests

## Target Metrics

| Metric | Baseline | Target |
|--------|----------|--------|
| Line Coverage | ~30-40% | >75% |
| Branch Coverage | ~25-35% | >60% |
| Flaky Tests | Present | Fixed |
| Redundant Tests | Present | Parameterized |

## Prerequisites

- Node.js 20+
- npm 10+
- VS Code with GitHub Copilot

## License

See [LICENSE](LICENSE) file for details.
