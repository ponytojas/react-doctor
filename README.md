# React Doctor

[![version](https://img.shields.io/npm/v/react-doctor?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/react-doctor)
[![downloads](https://img.shields.io/npm/dt/react-doctor.svg?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/react-doctor)

Let coding agents diagnose and fix your React code.

One command scans your codebase for security, performance, correctness, and architecture issues, then outputs a **0–100 score** with actionable diagnostics.

### [See it in action →](https://react.doctor)

## Install

Run this at your project root:

```bash
npx react-doctor@latest .
```

Use `--verbose` to see affected files and line numbers:

```bash
npx react-doctor@latest . --verbose
```

## What it checks

React Doctor runs **47+ rules** across these categories:

| Category | Examples |
|---|---|
| **State & Effects** | Derived state in useEffect, cascading setState, missing cleanup |
| **Architecture** | Nested component definitions, giant components, inline render functions |
| **Performance** | Layout property animations, transition-all, large animated blur |
| **Correctness** | Array index as key, conditional rendering bugs |
| **Next.js** | Missing metadata, client-side fetching for server data, async client components |
| **Bundle Size** | Barrel imports, full lodash import, undeferred third-party scripts |
| **Security** | Hardcoded secrets in client code, eval usage |
| **Server** | Missing auth in server actions, blocking operations without after() |
| **Accessibility** | Missing prefers-reduced-motion checks |
| **Dead Code** | Unused files, exports, types, and duplicate exports |

## Example output

```
$ npx react-doctor@latest .

react-doctor v0.0.5

✓ Detecting framework. Found Next.js.
✓ Detecting React version. Found React 18.2.0.
✓ Detecting language. Found TypeScript.
✓ Found 147 source files.

✓ Running lint checks.
✓ Detecting dead code.

  ✗ Derived state computed in useEffect (5)
  ✗ Array index used as key (12)
  ✗ Data fetched in useEffect without cleanup (8)
  ✗ Component "UserCard" inside "Dashboard" — destroys state every render (4)

  42 / 100  Critical

  ████████████░░░░░░░░░░░░░░░░░░

  29 errors  across 18 files  in 2.1s
```

## Options

```
Usage: react-doctor [directory] [options]

Options:
  -v, --version     display the version number
  --no-lint         skip linting
  --no-dead-code    skip dead code detection
  --verbose         show file details per rule
  --score           output only the score
  -y, --yes         skip prompts, scan all workspace projects
  --project <name>  select workspace project (comma-separated for multiple)
  -h, --help        display help for command
```

## Use with coding agents

React Doctor is designed to work with coding agents like Cursor, Claude Code, Codex, and Copilot. Run it in your project, then paste the output into your agent to get fixes.

```bash
npx react-doctor@latest . --verbose
```

The `--verbose` flag includes file paths and line numbers so your agent knows exactly where to look.

## Contributing

Want to contribute? Check out the codebase and submit a PR.

```bash
git clone https://github.com/aidenybai/react-doctor
cd react-doctor
pnpm install
pnpm -r run build
```

Run locally:

```bash
node packages/react-doctor/dist/cli.js /path/to/your/react-project
```

### License

React Doctor is MIT-licensed open-source software.
