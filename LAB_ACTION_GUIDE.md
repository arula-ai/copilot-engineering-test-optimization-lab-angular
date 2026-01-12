# Lab Action Guide – Angular/Jest

Follow these lean steps using the Critique-then-Create methodology. Use the custom agents in `.github/agents/` and prompts in `.github/prompts/` throughout.

## How to Use Custom Agents & Prompts

### Selecting an Agent
1. Open **GitHub Copilot Chat** in VS Code (Ctrl+Shift+I or Cmd+Shift+I)
2. Click the **Agents dropdown** at the top of the chat input (shows current agent name)
3. Select the agent you want to use (e.g., "Test Critique", "Test Create", "Test Quality Gate")
4. The agent's instructions will guide Copilot's responses for that conversation

### Using Prompts
- Type `/` in Copilot Chat to see available prompts
- Select a prompt like `/coverage-analysis` or `/fix-flaky-test`
- The prompt template will be applied to your request

### Agent Mode vs Custom Agents
- **Agent Mode**: Default Copilot behavior with full tool access
- **Custom Agents**: Specialized agents with domain-specific instructions (select from dropdown)

---

## Quick Reference

| Stage | Agent (Select from Dropdown) | Core Artifacts / Commands |
| --- | --- | --- |
| 0 | Agent Mode (default) | `npm install`, `npm test`, `npm run test:coverage` |
| 1 | **Test Critique** | Analysis document, `.golden-examples/` |
| 2 | **Test Create** + Prompts | `*.spec.ts` files, coverage improvement |
| 3 | **Test Quality Gate** | `Jenkinsfile`, `sonar-project.properties`, `jest.config.ts` |
| 4 | Agent Mode (default) | Final validation, commit changes |

---

## Stage 0 – Environment Setup

Use **Agent Mode** (default) for setup commands:

- `#runInTerminal cd angular` (navigate to Angular project folder)
- `#runInTerminal npm install`
- `#runInTerminal npm test` (verify tests run)
- `#runInTerminal npm run test:coverage` (establish baseline)
- `#runInTerminal open coverage/lcov-report/index.html` (review baseline coverage)
- Note: Record baseline coverage percentage for comparison

---

## Stage 1 – Coverage Gap Analysis (CRITIQUE Phase)

**Select "Test Critique" agent from the dropdown**, then:

1. Ask: "Analyze all services in `src/app/core/services/` for coverage gaps"
2. Ask: "Identify anti-patterns like flaky tests and redundancies"
3. Ask: "Document findings for use in test generation"

**Alternative**: Use `/coverage-analysis` prompt for quick analysis

After analysis, verify:
- Review `.golden-examples/` to understand available patterns

### Key Analysis Areas
- Payment service: HTTP error handling gaps
- User service: Redundant validation tests
- Order service: Flaky async tests
- Inventory service: Missing signal tests

---

## Stage 2 – Test Enhancement (CREATE Phase)

**Select "Test Create" agent from the dropdown** for all Stage 2 tasks.

### Task 2.1 – Refactor Redundant Tests
- Reference: Analysis redundancy section
- Use prompt: `/refactor-to-parameterized` for user.service.spec.ts
- Reference: `.golden-examples/parameterized-tests/` for `test.each` pattern
- Verify: `#runInTerminal npm test -- --testPathPattern=user.service`
- Target: 50%+ line reduction in validation tests

### Task 2.2 – Fix Flaky Tests
- Reference: Analysis anti-patterns section
- Use prompt: `/fix-flaky-test` for order.service.spec.ts
- Reference: `.golden-examples/async-patterns/` for `fakeAsync`/`tick` pattern
- Verify: `#runInTerminal for i in {1..5}; do npm test -- --testPathPattern=order.service; done`

### Task 2.3 – Generate HTTP Error Tests
- Reference: Analysis HTTP gaps
- Use prompt: `/generate-error-tests` for payment.service.spec.ts
- Reference: `.golden-examples/http-mocking/` and `.golden-examples/error-handling/`
- Verify: `#runInTerminal npm test -- --testPathPattern=payment.service`

### Task 2.4 – Generate Signal Tests
- Reference: Analysis signal gaps
- Reference: `.golden-examples/signal-testing/`
- Verify: `#runInTerminal npm test -- --testPathPattern=inventory.service`

### Task 2.5 – Generate Boundary Tests
- Use prompt: `/generate-boundary-tests` for validators
- Reference: `.golden-examples/boundary-testing/` for 7-point analysis
- Verify: `#runInTerminal npm test`

### Verification
- `#runInTerminal npm run test:coverage`
- Compare coverage to Stage 0 baseline
- Target: Coverage improved by 15%+

---

## Stage 3 – Quality Gates & CI (Jenkins + SonarQube)

**Select "Test Quality Gate" agent from the dropdown**, then:

1. Ask: "Configure Jest coverage thresholds in jest.config.ts"
2. Ask: "Generate sonar-project.properties for SonarQube"
3. Ask: "Generate Jenkinsfile with test, coverage, and quality gate stages"
4. Ask: "Add jest-junit and jest-sonar-reporter to package.json"

### Configuration Files to Create
- `jest.config.ts` – coverage thresholds (60% global, 80% critical services)
- `sonar-project.properties` – SonarQube project configuration
- `Jenkinsfile` – Pipeline with test, coverage, and quality gate stages

### Verification
- `#runInTerminal npm run test:coverage` (verify thresholds enforced)
- `#runInTerminal cat sonar-project.properties` (verify SonarQube config)
- `#runInTerminal cat Jenkinsfile` (verify pipeline structure)

---

## Stage 4 – Final Validation & Submission

Switch back to **Agent Mode** (default) for final validation:

- `#runInTerminal npm run lint` (no errors)
- `#runInTerminal npm test` (all tests pass)
- `#runInTerminal npm run test:coverage` (thresholds met)
- Review analysis for completeness
- Commit changes with meaningful message
- Push branch and open PR if required

---

## Agent & Prompt Reference

### Custom Agents (Select from Dropdown)

| Agent | When to Use |
| --- | --- |
| **Test Critique** | Stage 1 – analyzing coverage gaps, anti-patterns |
| **Test Create** | Stage 2 – generating tests from analysis |
| **Test Quality Gate** | Stage 3 – Jenkins/SonarQube configuration |
| **Lab Validator** | Validate lab setup and instructions |

### Prompts (Type `/` in Chat)

| Prompt | Purpose |
| --- | --- |
| `/coverage-analysis` | Quick coverage gap analysis |
| `/refactor-to-parameterized` | Converting redundant tests to test.each |
| `/fix-flaky-test` | Diagnosing and fixing timing issues |
| `/generate-error-tests` | HTTP error and exception tests |
| `/generate-boundary-tests` | 7-point boundary value tests |

---

## Golden Examples Reference

| Pattern | Location | Use For |
| --- | --- | --- |
| Parameterized Tests | `.golden-examples/parameterized-tests/` | Redundancy reduction |
| HTTP Mocking | `.golden-examples/http-mocking/` | Service HTTP tests |
| Signal Testing | `.golden-examples/signal-testing/` | Angular 19 signals |
| Async Patterns | `.golden-examples/async-patterns/` | Flaky test fixes |
| Error Handling | `.golden-examples/error-handling/` | Exception tests |
| Boundary Testing | `.golden-examples/boundary-testing/` | Edge case tests |

---

## Workflow Loop

```
Test Critique Agent → Analysis → Test Create Agent → Test Quality Gate Agent
```

Each stage builds on the previous. The analysis is the bridge between CRITIQUE and CREATE phases.
