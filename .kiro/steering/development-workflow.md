---
inclusion: auto
---

# Development Workflow Rules

## 🎯 Core Principles

These rules apply to ALL development work in this project.

## 📚 Rule 1: Always Read Steering Files

**CRITICAL**: Before making ANY changes to code, you MUST:

1. **Check for relevant steering files** in `.kiro/steering/`
2. **Read applicable steering files** that match the area you're working on
3. **Follow the principles** outlined in those files

### When to Read Steering Files

- **Before starting any task** - Check if there are steering files for that area
- **When working on canvas-preview** - Read `video-playback-architecture.md`
- **When working on timeline** - Read timeline-related steering files
- **When in doubt** - Read all steering files to understand the project

### How to Identify Relevant Steering Files

Steering files use `fileMatchPattern` in their frontmatter:

```yaml
---
inclusion: auto
fileMatchPattern: "src/features/canvas-preview/**/*"
---
```

If you're working on files matching that pattern, READ THAT STEERING FILE.

### Why This Matters

- **Prevents mistakes** - Steering files contain critical architectural decisions
- **Maintains consistency** - Ensures all code follows the same patterns
- **Saves time** - Avoids implementing solutions that violate core principles
- **Preserves knowledge** - Captures lessons learned from previous work

## ✅ Rule 2: Write Tests for All New Updates

**CRITICAL**: Every new feature, bug fix, or update MUST include tests.

### What Requires Tests

- ✅ **New functions** - Unit tests for all new functions
- ✅ **New components** - Component tests for React components
- ✅ **Bug fixes** - Regression tests to prevent the bug from returning
- ✅ **Refactors** - Tests to ensure behavior hasn't changed
- ✅ **New features** - Integration tests for feature workflows
- ✅ **API changes** - Tests for new API endpoints or changes

### Test Types Required

#### 1. Unit Tests

- Test individual functions in isolation
- Mock dependencies
- Cover edge cases and error conditions
- Location: `__tests__/` folder next to the code

#### 2. Integration Tests

- Test how components work together
- Test data flow between modules
- Test user workflows
- Location: `__tests__/` folder in feature directory

#### 3. Property-Based Tests (When Applicable)

- Test with random inputs
- Verify invariants hold
- Find edge cases automatically
- Use for complex logic (parsers, algorithms, etc.)

### Test Coverage Requirements

- **Minimum**: 80% code coverage for new code
- **Critical paths**: 100% coverage for core functionality
- **Edge cases**: Must test error conditions, boundary values, null/undefined

### Test File Naming

```
src/features/canvas-preview/utils/VideoPool.ts
src/features/canvas-preview/utils/__tests__/VideoPool.test.ts
```

### Test Structure

```typescript
describe("ComponentName or FunctionName", () => {
  describe("specific behavior or method", () => {
    it("should do something specific", () => {
      // Arrange
      const input = setupTestData();

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toBe(expectedValue);
    });

    it("should handle error case", () => {
      // Test error conditions
    });

    it("should handle edge case", () => {
      // Test boundary values
    });
  });
});
```

### When Tests Can Be Skipped

**NEVER**. Tests are always required.

If you think tests aren't needed, you're wrong. Even "simple" changes need tests.

### Test-Driven Development (Recommended)

For complex features:

1. Write tests first (TDD)
2. Watch them fail
3. Implement the feature
4. Watch tests pass
5. Refactor with confidence

## 🔄 Workflow Summary

For every code change:

```
1. Read relevant steering files
   ↓
2. Understand the architecture
   ↓
3. Write tests (or update existing tests)
   ↓
4. Implement the change
   ↓
5. Run tests
   ↓
6. Verify tests pass
   ↓
7. Commit
```

## 🚫 What NOT to Do

### ❌ Don't Skip Steering Files

```
// BAD: Making changes without reading steering files
// This violates core architectural principles
```

### ❌ Don't Skip Tests

```
// BAD: "This is a small change, doesn't need tests"
// ALL changes need tests
```

### ❌ Don't Write Tests After the Fact

```
// BAD: Implement feature → "I'll write tests later"
// Tests should be written WITH the code, not after
```

### ❌ Don't Write Superficial Tests

```
// BAD: Tests that don't actually test anything
it('should exist', () => {
  expect(myFunction).toBeDefined(); // Useless test
});

// GOOD: Tests that verify behavior
it('should return sum of two numbers', () => {
  expect(add(2, 3)).toBe(5);
});
```

## 📋 Checklist for Every Change

Before submitting any code change, verify:

- [ ] Read all relevant steering files
- [ ] Understood the architectural principles
- [ ] Followed the patterns in steering files
- [ ] Written tests for new functionality
- [ ] Written tests for bug fixes (regression tests)
- [ ] Updated existing tests if behavior changed
- [ ] All tests pass
- [ ] Code coverage meets requirements (80%+)
- [ ] Tests cover edge cases and error conditions

## 🎓 Why These Rules Exist

### Steering Files Prevent:

- Architectural violations
- Repeated mistakes
- Inconsistent patterns
- Lost knowledge
- Wasted time on wrong approaches

### Tests Prevent:

- Regressions (bugs coming back)
- Breaking changes
- Unclear requirements
- Fear of refactoring
- Production bugs

## 🔍 Examples

### Example 1: Adding a New Feature to Canvas Preview

```
1. Read .kiro/steering/video-playback-architecture.md
2. Understand: Videos must stay paused, RAF is not a clock, etc.
3. Write tests:
   - src/features/canvas-preview/utils/__tests__/NewFeature.test.ts
4. Implement feature following steering principles
5. Run tests: npm test
6. Verify all tests pass
7. Commit
```

### Example 2: Fixing a Bug

```
1. Read relevant steering files for the area
2. Write a failing test that reproduces the bug
3. Fix the bug
4. Verify the test now passes
5. Add additional tests for edge cases
6. Commit with test and fix together
```

### Example 3: Refactoring

```
1. Read steering files to understand current architecture
2. Ensure existing tests pass (baseline)
3. Refactor code
4. Verify all existing tests still pass
5. Add new tests if behavior expanded
6. Commit
```

## 🎯 Success Criteria

You're following these rules correctly when:

- ✅ You read steering files BEFORE coding
- ✅ You write tests WITH your code (not after)
- ✅ All tests pass before committing
- ✅ Code follows architectural principles from steering files
- ✅ New features have comprehensive test coverage
- ✅ Bug fixes include regression tests

## 📚 Related Files

- `.kiro/steering/video-playback-architecture.md` - Canvas preview architecture
- Test files in `__tests__/` folders throughout the codebase

---

**Remember**: Steering files + Tests = Quality Code + Maintainable Codebase
