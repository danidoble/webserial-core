# Tests

This directory contains the test suite for webserial-core.

## Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

## Test Structure

- `utils.test.ts` - Tests for utility functions
- `Dispatcher.test.ts` - Tests for the event dispatcher system
- `SerialError.test.ts` - Tests for custom error handling
- Additional test files should follow the pattern `*.test.ts`

## Writing Tests

Tests use [Vitest](https://vitest.dev/) as the testing framework with happy-dom for browser environment simulation.

Example:
```typescript
import { describe, it, expect } from 'vitest';

describe('MyFeature', () => {
  it('should do something', () => {
    expect(true).toBe(true);
  });
});
```
