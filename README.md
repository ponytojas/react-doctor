# React Doctor

> [!WARNING]
> This project is under active development and is not ready for production use. APIs and behavior may change at any time.

A general-purpose CLI that diagnoses React codebase health. Run it in a project root, it scans the codebase, and outputs a **0-100 score** with categorized violations.

## Testing

```bash
pnpm -r run build && node packages/react-doctor/dist/cli.js ./website
```

Point it at any React project:

```bash
node packages/react-doctor/dist/cli.js /path/to/your/react-project
```
