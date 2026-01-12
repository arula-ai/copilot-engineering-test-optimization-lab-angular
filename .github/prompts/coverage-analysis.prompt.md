---
description: "Analyze test coverage gaps and save findings to docs/TEST_ANALYSIS.md for use in test generation"
---

# Coverage Gap Analysis

Perform a comprehensive CRITIQUE analysis of the test suite.

## Instructions

1. **This is an Angular/Jest project**

2. **For each service/component**, analyze:
   - Which methods are tested vs untested
   - Which error paths are covered vs missing
   - Which boundary conditions are tested
   - Which async scenarios are handled

3. **Detect anti-patterns**:
   - Flaky test indicators (real timers, random values, shared state)
   - Redundant tests (duplicate structure, copy-paste patterns)
   - Missing cleanup (afterEach, @AfterEach)

4. **Reference Golden Examples**:
   - Check `.golden-examples/` for applicable patterns
   - Note which patterns should be used for each gap

5. **Save analysis to `docs/TEST_ANALYSIS.md`** with structure:
   ```markdown
   # Test Analysis Report
   ## Date: [today]

   ## Executive Summary
   - Estimated coverage: X%
   - Critical gaps: N
   - Anti-patterns found: N

   ## Service: [Name]
   ### Coverage Gaps
   ### Anti-Patterns
   ### Applicable Golden Examples

   ## Prioritization Plan
   ### Priority 1: Critical
   ### Priority 2: High
   ### Priority 3: Medium
   ```

## Output

Create or update `docs/TEST_ANALYSIS.md` with complete analysis.
