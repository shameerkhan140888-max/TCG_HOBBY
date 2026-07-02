# Contributing

## Standards

- Keep every commit compiling.
- Add or update tests for changed behaviour.
- Update documentation when architecture, API contracts, database shape, or user workflows change.
- Keep domain logic independent from framework code.
- Do not introduce placeholder implementations.

## Before Opening a Pull Request

Run:

```bash
npm run typecheck
npm run test
npm run build
```

## Review Focus

Reviews prioritize correctness, security, data integrity, accessibility, maintainability, and fit with the clean architecture boundaries.

## Security

Do not commit secrets. Use environment variables for credentials, API keys, database URLs, Auth.js secrets, and Stripe keys.
