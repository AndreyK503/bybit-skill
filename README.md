# bybit-skill

Read-only CLI and agent skill for a Bybit account (UTA): portfolio, options, history, market data.
Requirements: `spec.md`. Technical plan: `plan.md`.

## Development

```
npm install
npx vitest run
npx tsc --noEmit
npx eslint .
npm run build     # -> skills/bybit/scripts/bybit.cjs
```
