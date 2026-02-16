# react-doctor plan

A general-purpose CLI that diagnoses React codebase health. Run `npx react-doctor` in a project root, it scans the codebase, and outputs a **0-100 score** with categorized violations and code frames.

## Step 1: Project Discovery

Before any detection runs, build a single file list shared across all layers:

1. Run `git ls-files --cached --others --exclude-standard` to get all tracked + unignored files
2. Parse `tsconfig.json` `include`/`exclude` to further filter
3. Pass that file list to all 4 layers (oxlint via `--paths`, eslint via file args, custom checks iterate the list)

Also detect:

- React project (find `package.json`, check for `react` dependency)
- Source directories
- Framework (Next.js, Vite, CRA, etc.)

## Step 2: Detection Layer 1 — Oxlint (native, fast)

Run oxlint with a bundled `.oxlintrc.json` enabling these plugins. Spawn with `--tsconfig ./tsconfig.json` for TS path alias awareness.

### `react` plugin — correctness

| Rule                             | What it catches                                       |
| -------------------------------- | ----------------------------------------------------- |
| `react/rules-of-hooks`           | Hooks called conditionally or in loops                |
| `react/no-direct-mutation-state` | Mutating `this.state` directly                        |
| `react/jsx-no-duplicate-props`   | Duplicate props on JSX elements                       |
| `react/jsx-key`                  | Missing `key` prop in iterators                       |
| `react/no-children-prop`         | Passing children as a prop instead of nesting         |
| `react/no-danger`                | `dangerouslySetInnerHTML` usage — XSS risk[^21]       |
| `react/jsx-no-script-url`        | `javascript:` URLs in `href` — XSS vector             |
| `react/no-render-return-value`   | Using return value of `ReactDOM.render()`             |
| `react/no-string-refs`           | String refs (deprecated, use `useRef`)                |
| `react/no-unescaped-entities`    | Unescaped `>`, `"`, `}` in JSX text                   |
| `react/no-is-mounted`            | `isMounted()` anti-pattern                            |
| `react/require-render-return`    | Missing return in `render()`                          |
| `react/no-unknown-property`      | Unknown DOM properties (e.g., `class` vs `className`) |

### `jsx-a11y` plugin — accessibility

| Rule                                              | What it catches                                            |
| ------------------------------------------------- | ---------------------------------------------------------- |
| `jsx-a11y/alt-text`                               | Missing `alt` on `<img>`, `<area>`, `<input type="image">` |
| `jsx-a11y/anchor-is-valid`                        | `<a>` without `href` or with `#`                           |
| `jsx-a11y/click-events-have-key-events`           | `onClick` without `onKeyDown`/`onKeyUp`                    |
| `jsx-a11y/no-static-element-interactions`         | `<div onClick/>` — non-interactive elements with handlers  |
| `jsx-a11y/no-noninteractive-element-interactions` | Click handlers on `<li>`, `<table>`, etc.                  |
| `jsx-a11y/role-has-required-aria-props`           | ARIA roles missing required attributes                     |
| `jsx-a11y/no-autofocus`                           | `autoFocus` prop — disrupts screen readers                 |
| `jsx-a11y/heading-has-content`                    | Empty headings `<h1></h1>`                                 |
| `jsx-a11y/html-has-lang`                          | `<html>` without `lang` attribute                          |
| `jsx-a11y/no-redundant-roles`                     | Redundant ARIA roles (e.g., `<button role="button">`)      |
| `jsx-a11y/scope`                                  | `scope` attribute on non-`<th>` elements                   |
| `jsx-a11y/tabindex-no-positive`                   | Positive `tabindex` values (disrupts tab order)            |
| `jsx-a11y/label-has-associated-control`           | `<label>` not associated with a form control               |
| `jsx-a11y/no-distracting-elements`                | `<marquee>`, `<blink>` elements                            |
| `jsx-a11y/iframe-has-title`                       | `<iframe>` without `title`                                 |

### `react-perf` plugin — render performance

| Rule                                     | What it catches                                                               |
| ---------------------------------------- | ----------------------------------------------------------------------------- |
| `react-perf/jsx-no-new-object-as-prop`   | `prop={{}}` creating new object every render                                  |
| `react-perf/jsx-no-new-array-as-prop`    | `prop={[]}` creating new array every render                                   |
| `react-perf/jsx-no-new-function-as-prop` | `prop={() => {}}` creating new function every render (on non-leaf components) |
| `react-perf/jsx-no-jsx-as-prop`          | `prop={<Component/>}` creating new JSX every render                           |

### `import` plugin — bundle hygiene

| Rule                      | What it catches                            |
| ------------------------- | ------------------------------------------ |
| `import/no-cycle`         | Circular dependencies between modules      |
| `import/no-self-import`   | Module importing itself                    |
| `import/no-duplicates`    | Duplicate imports from same module         |
| `import/no-named-default` | `import { default as X }` — use `import X` |

### `typescript` plugin — type safety

| Rule                                       | What it catches                             |
| ------------------------------------------ | ------------------------------------------- |
| `typescript/consistent-type-imports`       | Missing `type` keyword on type-only imports |
| `typescript/no-explicit-any`               | Explicit `any` type annotations             |
| `typescript/no-non-null-assertion`         | Non-null assertions (`!`)                   |
| `typescript/prefer-ts-expect-error`        | `@ts-ignore` instead of `@ts-expect-error`  |
| `typescript/no-unnecessary-type-assertion` | Redundant type assertions                   |

## Step 3: Detection Layer 2 — Custom Oxlint JS Plugin Rules

Oxlint supports custom JS plugins with an ESLint-compatible visitor API[^15]. Instead of regex grep, we write proper AST-based rules that ship as a bundled plugin (`react-doctor-plugin.js`) loaded via `jsPlugins` in the oxlint config. This gives us code frames, fix suggestions, and consistent output format for free.

Plugin location: `packages/react-doctor/src/plugin/react-doctor-plugin.js`

### useEffect anti-patterns

| Rule                                   | What it detects                                                                                             | Severity |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------- |
| `react-doctor/no-derived-state-effect` | `useEffect(() => { setState(fn(dep)) }, [dep])` — state that should be computed during render instead[^16]  | Critical |
| `react-doctor/no-fetch-in-effect`      | `fetch()` / `axios` / `ky` calls inside `useEffect` callbacks — should use react-query/SWR/a data framework | Critical |
| `react-doctor/no-cascading-set-state`  | Multiple `setState` calls in a single `useEffect` — usually indicates derived state or a reducer            | Warning  |
| `react-doctor/no-effect-event-handler` | `useEffect` that runs on mount + deps to simulate an event handler — should be an actual event handler      | Warning  |
| `react-doctor/useeffect-count`         | Reports total `useEffect` count as a metric (not a violation, a signal)                                     | Info     |

#### `no-derived-state-effect` detection logic

Visit `CallExpression` where callee is `useEffect`. Walk the callback body for `CallExpression` nodes where callee matches a `set*` pattern (useState setter). If the setter's argument only references values from the dependency array, it's derived state — flag it.

```
// BAD: derived state in effect
const [fullName, setFullName] = useState('');
useEffect(() => {
  setFullName(first + ' ' + last);
}, [first, last]);

// GOOD: compute during render
const fullName = first + ' ' + last;
```

#### `no-fetch-in-effect` detection logic

Visit `CallExpression` where callee is `useEffect`. Walk the callback body for calls to `fetch`, `axios.get/post/put/delete`, `ky.get/post`, or any imported function from `node-fetch`, `got`, etc. Flag with message suggesting react-query/SWR/server components.

### Red flag rules (Jacob Paris[^1])

| Rule                                        | What it detects                                                                                                                                        | Severity |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| `react-doctor/no-generic-handler-names`     | JSX event props bound to functions named `handleClick`, `handleSubmit`, `handleChange`, etc. — name should describe _what_ it does, not _when_ it runs | Warning  |
| `react-doctor/no-prevent-default`           | `event.preventDefault()` calls — flags for review since it only works after JS loads, breaks progressive enhancement                                   | Info     |
| `react-doctor/no-usememo-simple-expression` | `useMemo` wrapping a trivially cheap expression (string concat, boolean check, simple arithmetic) — memo overhead exceeds the computation              | Warning  |

#### `no-generic-handler-names` detection logic

Visit `JSXAttribute` where name starts with `on` (e.g. `onClick`, `onSubmit`). If the value is an identifier matching `/^handle[A-Z]/`, flag it. Inline callbacks (`onClick={() => ...}`) are fine — they describe what happens at the call site.

```
// BAD: non-descriptive, loses colocation
<button onClick={handleClick}>Save</button>

// GOOD: describes what happens
<button onClick={() => {
  analytics.track('save-draft');
  saveDraft();
}}>Save</button>
```

### Animation & motion rules

Based on the Motion animation performance tier list[^9] and Motion performance docs[^17]. These detect patterns that cause jank, layout thrashing, or accessibility issues in animated UIs.

| Rule                                               | What it detects                                                                                                                                                                                                                                                                                                                                   | Severity |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `react-doctor/no-layout-property-animation`        | Animating layout-triggering CSS properties (`width`, `height`, `padding`, `margin`, `top`, `left`, `right`, `bottom`, `border-width`) in motion component `animate`/`transition` props, CSS `transition` properties, or inline style updates in `requestAnimationFrame` loops — these trigger layout + paint + composite every frame (D-tier)[^9] | Critical |
| `react-doctor/prefer-transform-values`             | Motion component using `animate={{ width: ... }}` instead of `animate={{ scale: ... }}` or the `layout` prop — prefer `transform`/`opacity`/`filter`/`clip-path` which only trigger composite (S-tier)                                                                                                                                            | Warning  |
| `react-doctor/no-global-css-variable-animation`    | Animating CSS variables on `:root`/`html`/`body` via JS (`element.style.setProperty('--x', ...)` in a rAF/interval) — the "inheritance bomb" forces style recalc on the entire tree, can cost 8ms+ per frame on complex DOMs                                                                                                                      | Critical |
| `react-doctor/no-large-blur`                       | `filter: blur()` with radius > 10px — cost escalates sharply with radius and layer size, can blow GPU memory on mobile[^9]                                                                                                                                                                                                                        | Warning  |
| `react-doctor/require-reduced-motion`              | Project uses motion/framer-motion/CSS animations but has no `prefers-reduced-motion` media query or `useReducedMotion` hook — required for accessibility (WCAG 2.3.3)[^18]                                                                                                                                                                        | Critical |
| `react-doctor/use-lazy-motion`                     | Imports `motion` from `framer-motion` or `motion/react` without using `LazyMotion` + `m` — full motion component tree-shakes poorly, adds ~30kb to bundle[^17]                                                                                                                                                                                    | Warning  |
| `react-doctor/no-css-variable-in-compositor-value` | CSS variable used inside a compositor property (`opacity: var(--x)`, `transform: var(--y)`) — CSS variable changes ALWAYS trigger paint even when the property itself wouldn't, silently downgrades S-tier to C-tier[^9]                                                                                                                          | Warning  |

#### `no-layout-property-animation` detection logic

Visit `JSXAttribute` on motion components (`motion.div`, `m.div`, etc.) where attribute name is `animate`, `initial`, `exit`, `whileHover`, `whileTap`, `whileFocus`, `whileDrag`, or `whileInView`. Walk the value object for keys matching layout-triggering properties: `width`, `height`, `top`, `left`, `right`, `bottom`, `padding*`, `margin*`, `borderWidth`, `fontSize`, `lineHeight`, `gap`. Flag with message explaining the performance tier and suggesting `transform`/`scale`/`layout` prop alternatives.

Also detect in plain CSS/Tailwind:

- `transition: width`, `transition: height`, `transition: all` (catches layout properties)
- `@keyframes` that animate layout properties

```
// BAD: D-tier, triggers layout every frame
<motion.div animate={{ width: isOpen ? 500 : 0 }} />

// GOOD: S-tier with layout prop (FLIP technique, one measurement then transform)
<motion.div layout style={{ width: isOpen ? 500 : 0 }} />

// GOOD: S-tier, compositor-only
<motion.div animate={{ scale: isOpen ? 1 : 0 }} />
```

#### `require-reduced-motion` detection logic

Two-pass check:

1. Scan for animation usage: imports from `framer-motion`/`motion/react`, CSS `@keyframes`/`animation`/`transition` declarations, `requestAnimationFrame` usage
2. If animations exist, scan for `prefers-reduced-motion` in CSS (`@media (prefers-reduced-motion: reduce)`) or JS (`useReducedMotion`, `matchMedia('(prefers-reduced-motion: reduce)')`)
3. If animations exist but no reduced-motion handling found, flag

### Responsive design rules

Detect patterns that break responsive design or ignore mobile users.

| Rule                                        | What it detects                                                                                                                                                                                                 | Severity |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `react-doctor/no-fixed-dimensions`          | Hardcoded pixel `width`/`height` on container/wrapper elements (not icons/avatars) — prevents fluid layout. Detect in inline styles (`style={{ width: 500 }}`) and common patterns like `className="w-[847px]"` | Warning  |
| `react-doctor/prefer-container-queries`     | Media query breakpoints used inside reusable components that could be placed in different layout contexts — container queries (`@container`) make components truly portable[^19]                                | Info     |
| `react-doctor/no-desktop-first-breakpoints` | Tailwind classes that only apply at `md:` or `lg:` without a mobile-first base — layout breaks on mobile. e.g., `className="md:flex md:justify-center"` without base `flex`                                     | Warning  |

### Security rules

| Rule                                         | What it detects                                                                                                                                                                                                  | Severity |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `react-doctor/no-dangerously-set-inner-html` | `dangerouslySetInnerHTML` without sanitization — XSS vector. Supplements oxlint's `react/no-danger` by also checking if a DOMPurify/sanitize-html call wraps the value                                           | Critical |
| `react-doctor/no-user-input-in-href`         | Dynamic user-controlled values passed to `<a href={...}>` or `<Link href={...}>` without validation — `javascript:` injection risk                                                                               | Critical |
| `react-doctor/no-secrets-in-client-code`     | Hardcoded API keys, tokens, or secrets in client-side code (regex for common patterns: `sk_live_`, `AKIA`, `ghp_`, `Bearer`, long hex/base64 strings assigned to variables named `*key*`, `*secret*`, `*token*`) | Critical |
| `react-doctor/no-eval`                       | `eval()`, `new Function()`, `setTimeout(string)` — code injection risk                                                                                                                                           | Critical |

### State management rules

| Rule                                           | What it detects                                                                                                                                                       | Severity |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `react-doctor/no-derived-useState`             | `useState` initialized from props/other state that could be a plain `const` — storing derived data creates sync bugs[^22]                                             | Warning  |
| `react-doctor/no-prop-drilling`                | Props passed through 3+ component levels unchanged — suggests extracting to context or composition                                                                    | Info     |
| `react-doctor/no-context-for-frequent-updates` | `useContext` consumer that re-renders frequently (context value is an object/array recreated each render without memo) — use a state management lib or split contexts | Warning  |
| `react-doctor/prefer-useReducer`               | `useState` with 3+ related state variables updated together in the same handlers — a reducer expresses the transitions more clearly                                   | Info     |
| `react-doctor/no-array-index-as-key`           | `arr.map((item, index) => <X key={index} />)` — causes bugs when list is reordered/filtered. Oxlint catches some cases but this adds detection for indirect patterns  | Warning  |

### Component architecture rules

| Rule                                          | What it detects                                                                                                                                                             | Severity |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `react-doctor/no-giant-component`             | Component function body exceeding 200 lines (configurable) — should be decomposed into smaller focused components                                                           | Warning  |
| `react-doctor/no-nested-component-definition` | Component defined inside another component's render — creates new instance every render, destroys state. Supplements React Compiler's `component-hook-factories`            | Critical |
| `react-doctor/no-conditional-hook-pattern`    | Hooks called inside conditionals, loops, or after early returns — violates Rules of Hooks. Supplements oxlint's `rules-of-hooks` with better detection of indirect patterns | Critical |
| `react-doctor/no-barrel-import`               | `import { X } from './components'` or `import { X } from './index'` — barrel files defeat tree-shaking and bloat bundles[^4]                                                | Warning  |
| `react-doctor/no-render-in-render`            | JSX expression that calls a function returning JSX inline (`{renderHeader()}`) instead of extracting to a component — breaks React's reconciliation assumptions             | Warning  |

### Bundle size rules

| Rule                                     | What it detects                                                                                                                                                                    | Severity |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `react-doctor/no-full-lodash-import`     | `import _ from 'lodash'` or `import { debounce } from 'lodash'` instead of `import debounce from 'lodash/debounce'` — imports entire 70kb library                                  | Warning  |
| `react-doctor/no-moment`                 | `moment` in package.json dependencies — 300kb+ library, use `date-fns` or `dayjs`                                                                                                  | Warning  |
| `react-doctor/no-undeferred-third-party` | Analytics/tracking scripts (`<script src="...google-analytics...">`) loaded synchronously instead of deferred — blocks first paint[^4]                                             | Warning  |
| `react-doctor/prefer-dynamic-import`     | Large component imports (known-heavy libs: `@monaco-editor`, `recharts`, `@react-pdf`, `react-quill`, `@codemirror`) without `next/dynamic` or `React.lazy` — should be code-split | Warning  |

### Next.js specific rules (conditional — only when Next.js detected in deps)

| Rule                                                        | What it detects                                                                                                                                                                                                  | Severity |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `react-doctor/nextjs-no-img-element`                        | `<img>` instead of `next/image` — misses automatic optimization, lazy loading, responsive srcset[^13]                                                                                                            | Warning  |
| `react-doctor/nextjs-no-a-element`                          | `<a>` for internal links instead of `next/link` — misses client-side navigation, prefetching                                                                                                                     | Warning  |
| `react-doctor/nextjs-async-client-component`                | `async` function in a `'use client'` file — client components cannot be async[^13]                                                                                                                               | Critical |
| `react-doctor/nextjs-no-use-search-params-without-suspense` | `useSearchParams()` without a `<Suspense>` boundary — causes entire page to CSR bail out[^13]                                                                                                                    | Critical |
| `react-doctor/nextjs-no-client-fetch-for-server-data`       | `useEffect` + `fetch` in a page/layout that could be a server component — data should be fetched server-side                                                                                                     | Warning  |
| `react-doctor/nextjs-missing-metadata`                      | Page without `metadata` export or `generateMetadata` — hurts SEO                                                                                                                                                 | Info     |
| `react-doctor/nextjs-missing-error-boundary`                | Route segment without `error.tsx` — unhandled errors crash the page                                                                                                                                              | Info     |
| `react-doctor/nextjs-no-client-side-redirect`               | `useRouter().push()` in `useEffect` on mount for redirects — should use `redirect()` in server component or middleware                                                                                           | Warning  |
| `react-doctor/nextjs-no-redirect-in-try-catch`              | `redirect()`/`notFound()`/`permanentRedirect()`/`forbidden()`/`unauthorized()` called inside try-catch without re-throw — these throw special errors Next.js handles internally, catching them breaks navigation | Critical |
| `react-doctor/nextjs-image-missing-sizes`                   | `<Image>` with `fill` prop but no `sizes` attribute — downloads largest image, defeats responsive optimization                                                                                                   | Warning  |
| `react-doctor/nextjs-no-native-script`                      | `<script>` instead of `next/script` `<Script>` — misses loading strategy optimization, deferred loading                                                                                                          | Warning  |
| `react-doctor/nextjs-inline-script-missing-id`              | `<Script>` with `dangerouslySetInnerHTML` or children but no `id` attribute — Next.js can't track inline scripts without an id                                                                                   | Warning  |
| `react-doctor/nextjs-no-font-link`                          | `<link>` tag or CSS `@import` loading Google Fonts instead of `next/font` — blocks rendering, misses self-hosting and zero layout shift                                                                          | Warning  |

### TypeScript quality signals

These are reported as metrics alongside the score, not individual violations:

| Metric                                  | What it measures                             | Signal                               |
| --------------------------------------- | -------------------------------------------- | ------------------------------------ |
| `any` count                             | Total `any` type annotations across codebase | High count = weak type safety        |
| `@ts-ignore` / `@ts-expect-error` count | Type suppression comments                    | High count = type system workarounds |
| `!` (non-null assertion) count          | Non-null assertions                          | High count = unsafe assumptions      |
| Type coverage ratio                     | Typed exports vs untyped                     | Low ratio = incomplete typing        |

### Testing signals

Lightweight heuristics — not violations, just health indicators:

| Metric                  | What it measures                                                       | Signal                           |
| ----------------------- | ---------------------------------------------------------------------- | -------------------------------- |
| Test file ratio         | Number of `*.test.*` / `*.spec.*` files relative to component files    | Low ratio = undertested          |
| Colocated tests         | Test files next to their source vs in a separate `__tests__` directory | Colocation is preferred          |
| Test framework detected | Presence of `vitest`, `jest`, `@testing-library/react` in deps         | Missing = no test infrastructure |

### Filesystem / package.json checks (no AST needed)

These run as part of the CLI directly, not as oxlint rules:

| Check                                    | Detection Method                                                                                                                                                                          | Severity |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `hooks/` directory                       | Filesystem check for directories named `hooks` — colocation is better[^1]                                                                                                                 | Warning  |
| CSS files (`.css`, `.scss`, `.less`)     | Glob for stylesheets (excluding a single root-level one) — competing with component styles[^1]                                                                                            | Warning  |
| Icon library in `package.json`           | Check deps for known icon packages (`lucide-react`, `react-icons`, `@heroicons/react`, `@fortawesome`, `@phosphor-icons`, `@tabler/icons-react`, `react-feather`) — bundle bloat risk[^1] | Info     |
| Missing viewport meta                    | Check HTML entry (`index.html`, `layout.tsx`, `_document.tsx`) for `<meta name="viewport" content="width=device-width, initial-scale=1">`                                                 | Critical |
| Animation library without reduced-motion | Check if `framer-motion`/`motion` is in deps but no `prefers-reduced-motion` usage found anywhere                                                                                         | Critical |
| Outdated React version                   | Check `react` version in deps — flag if < 18 (missing concurrent features, Suspense, automatic batching)                                                                                  | Warning  |
| Missing `React.StrictMode`               | Check entry point for `<StrictMode>` wrapper — catches side-effect bugs in development                                                                                                    | Info     |
| Large dependency count                   | Flag if `dependencies` (not devDependencies) exceed 40 packages — bundle bloat signal                                                                                                     | Info     |
| Duplicate React versions                 | Check `node_modules` for multiple `react` installations — causes hook errors and increased bundle                                                                                         | Critical |

## Step 4: Detection Layer 3 — Knip (dead code & dependency hygiene)

Shell out to `knip` with `--reporter json` and parse its output[^28]. Knip uses the TypeScript compiler + 100+ framework plugins (Next.js, Vite, Vitest, Storybook, etc.) to trace actual usage across the entire dependency graph. It finds things static linting can't.

| What Knip finds            | How it maps to scoring                                                                             | Severity |
| -------------------------- | -------------------------------------------------------------------------------------------------- | -------- |
| **Unused files**           | Source files that nothing imports — dead code bloating the repo                                    | Warning  |
| **Unused dependencies**    | `package.json` deps that no source file imports — wasted install + bundle risk                     | Warning  |
| **Unused devDependencies** | devDeps not referenced by any config/script — cleanup                                              | Info     |
| **Unused exports**         | Exported functions/components/types that nothing imports — dead code, misleads developers          | Warning  |
| **Unused types**           | Exported interfaces/types with zero consumers                                                      | Info     |
| **Unlisted dependencies**  | Imports that resolve from transitive deps but aren't in `package.json` — breaks on version changes | Critical |
| **Unlisted binaries**      | Scripts referencing binaries not installed as deps                                                 | Warning  |
| **Duplicate exports**      | Same symbol exported from multiple files                                                           | Info     |

### Why Knip over alternatives

- **ts-prune**: maintenance mode, no longer updated[^29]
- **unimported**: only finds unused files, not exports or types
- **ESLint no-unused-vars**: file-scoped only, can't see cross-module usage
- **Knip**: does all of the above, understands monorepos, has plugins for Next.js/Vite/Jest/Storybook entry points

### Integration approach

react-doctor bundles a minimal `knip.json` config and shells out:

```
npx knip --reporter json --no-exit-code
```

Parse the JSON output and map each finding to our scoring categories:

- Unused files/exports → Architecture score
- Unused/unlisted deps → Bundle Size score
- Unused types → TypeScript score

### Metrics reported

| Metric                    | Signal                        |
| ------------------------- | ----------------------------- |
| Unused file count         | Dead code accumulation        |
| Unused export count       | API surface bloat             |
| Unused dependency count   | Install/bundle overhead       |
| Unlisted dependency count | Fragile dependency resolution |

## Step 5: Detection Layer 4 — ESLint for React Compiler

Shell out to ESLint with `eslint-plugin-react-hooks` v7+ which bundles all React Compiler diagnostics[^2].

Classic rules:

- `rules-of-hooks`
- `exhaustive-deps`

Compiler diagnostic rules:

- `react-hooks/todo`
- `react-hooks/capitalized-calls`
- `react-hooks/hooks`
- `react-hooks/rule-suppression`
- `react-hooks/syntax`
- `react-hooks/unsupported-syntax`
- `config`
- `component-hook-factories`
- `globals`
- `incompatible-library`
- `refs`
- `purity`
- `error-boundaries`
- `set-state-in-render`

Porting these natively into oxlint isn't feasible today. `eslint-plugin-react-hooks` v7+ embeds the actual React Compiler and runs a full compiler pass to produce diagnostics. Its dependencies include `@babel/core`, `@babel/parser`, and `hermes-parser` — it needs Babel's AST infrastructure for deep static analysis (data flow, memoization boundaries, purity checks). Oxlint's JS plugin system expects ESLint-compatible visitor-pattern rules against oxlint's own AST (from the oxc parser), and the two AST formats are incompatible. See oxc-project/oxc#15258[^3].

## Step 6: Detection Layer 5 — Vercel React Best Practices (57 rules)

From `vercel-labs/agent-skills`[^4]. Each rule is mapped to how react-doctor detects it:

### 1. Eliminating Waterfalls — CRITICAL (5 rules)

| Rule                        | Detection                                                                       | Covered by                        |
| --------------------------- | ------------------------------------------------------------------------------- | --------------------------------- |
| `async-defer-await`         | AST: sequential `await` statements where the second doesn't depend on the first | Custom plugin rule                |
| `async-parallel`            | AST: two+ independent `await` calls that could be `Promise.all()`               | Custom plugin rule                |
| `async-dependencies`        | AST: `await` chains with partial dependencies                                   | Custom plugin rule                |
| `async-api-routes`          | AST: `await` at top of API route handler instead of deferred                    | Custom plugin rule (Next.js only) |
| `async-suspense-boundaries` | AST: async server component without `<Suspense>` parent                         | Custom plugin rule (Next.js only) |

### 2. Bundle Size Optimization — CRITICAL (5 rules)

| Rule                       | Detection                                                  | Covered by                               |
| -------------------------- | ---------------------------------------------------------- | ---------------------------------------- |
| `bundle-barrel-imports`    | AST: imports from index/barrel files                       | `react-doctor/no-barrel-import`          |
| `bundle-dynamic-imports`   | AST: heavy lib imports without `React.lazy`/`next/dynamic` | `react-doctor/prefer-dynamic-import`     |
| `bundle-defer-third-party` | AST/HTML: sync `<script>` for analytics/tracking           | `react-doctor/no-undeferred-third-party` |
| `bundle-conditional`       | AST: unconditional imports of feature-flag-gated modules   | Custom plugin rule                       |
| `bundle-preload`           | AST: navigation links without `prefetch` or hover preload  | Info-level signal                        |

### 3. Server-Side Performance — HIGH (7 rules)

| Rule                       | Detection                                                                             | Covered by                       |
| -------------------------- | ------------------------------------------------------------------------------------- | -------------------------------- |
| `server-auth-actions`      | AST: `'use server'` functions without auth check at top                               | Custom plugin rule               |
| `server-cache-react`       | AST: repeated identical data fetches across server components without `React.cache()` | Custom plugin rule               |
| `server-cache-lru`         | Heuristic: heavy computation in server components without caching                     | Info signal                      |
| `server-dedup-props`       | AST: same large data object passed to multiple client components                      | Custom plugin rule               |
| `server-serialization`     | AST: large objects/arrays passed as props from server to client components            | Custom plugin rule               |
| `server-parallel-fetching` | AST: sequential fetches in server component tree that could be parallelized           | Overlaps `async-parallel`        |
| `server-after-nonblocking` | AST: logging/analytics in server actions that should use `after()`                    | Custom plugin rule (Next.js 15+) |

### 4. Client-Side Data Fetching — MEDIUM-HIGH (4 rules)

| Rule                             | Detection                                                                                  | Covered by                    |
| -------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------- |
| `client-swr-dedup`               | AST: manual fetch deduplication logic instead of SWR/react-query                           | Overlaps `no-fetch-in-effect` |
| `client-event-listeners`         | AST: multiple `addEventListener` calls for same event on `window`/`document` without dedup | Custom plugin rule            |
| `client-passive-event-listeners` | AST: scroll/touch event listeners without `{ passive: true }`                              | Custom plugin rule            |
| `client-localstorage-schema`     | Heuristic: direct `localStorage.getItem`/`setItem` without schema versioning               | Info signal                   |

### 5. Re-render Optimization — MEDIUM (12 rules)

| Rule                                 | Detection                                                                                   | Covered by                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `rerender-defer-reads`               | AST: state subscription only used inside event handlers, not in render output               | Custom plugin rule                          |
| `rerender-memo`                      | AST: expensive computation inline in JSX without `useMemo`/extracted component              | Heuristic                                   |
| `rerender-memo-with-default-value`   | AST: default prop values `prop = {}` or `prop = []` in function params                      | Custom plugin rule                          |
| `rerender-dependencies`              | AST: object/array in useEffect deps instead of primitives                                   | Custom plugin rule                          |
| `rerender-derived-state`             | AST: subscribing to full object when only boolean check needed                              | Custom plugin rule                          |
| `rerender-derived-state-no-effect`   | AST: `useEffect` + `setState` for derived values                                            | `react-doctor/no-derived-state-effect`      |
| `rerender-functional-setstate`       | AST: `setState(count + 1)` instead of `setState(prev => prev + 1)` in callbacks             | Custom plugin rule                          |
| `rerender-lazy-state-init`           | AST: `useState(expensiveCall())` instead of `useState(() => expensiveCall())`               | Custom plugin rule                          |
| `rerender-simple-expression-in-memo` | AST: `useMemo` around trivial expressions                                                   | `react-doctor/no-usememo-simple-expression` |
| `rerender-move-effect-to-event`      | AST: effect that only runs in response to user interaction                                  | `react-doctor/no-effect-event-handler`      |
| `rerender-transitions`               | AST: `setState` for non-urgent updates without `startTransition`                            | Info signal                                 |
| `rerender-use-ref-transient-values`  | AST: `useState` for high-frequency values (mouse position, scroll) that don't affect render | Custom plugin rule                          |

### 6. Rendering Performance — MEDIUM (9 rules)

| Rule                                   | Detection                                                                              | Covered by         |
| -------------------------------------- | -------------------------------------------------------------------------------------- | ------------------ |
| `rendering-animate-svg-wrapper`        | AST: motion/animation props directly on `<svg>` element instead of wrapper `<div>`     | Custom plugin rule |
| `rendering-content-visibility`         | Heuristic: long lists without `content-visibility: auto`                               | Info signal        |
| `rendering-hoist-jsx`                  | AST: static JSX (no props/state refs) defined inside component instead of module scope | Custom plugin rule |
| `rendering-svg-precision`              | AST/Regex: SVG path `d` attributes with >2 decimal places                              | Custom plugin rule |
| `rendering-hydration-no-flicker`       | AST: `useEffect` + `setState` for client-only values causing flash                     | Custom plugin rule |
| `rendering-hydration-suppress-warning` | AST: expected hydration mismatches without `suppressHydrationWarning`                  | Custom plugin rule |
| `rendering-activity`                   | AST: conditional rendering with state that should use `<Activity>` (React 19.2+)       | Info signal        |
| `rendering-conditional-render`         | AST: `{condition && <Component/>}` that could render `0` or `""` — use ternary         | Custom plugin rule |
| `rendering-usetransition-loading`      | AST: `useState` for loading state during navigation instead of `useTransition`         | Custom plugin rule |

### 7. JavaScript Performance — LOW-MEDIUM (12 rules)

| Rule                        | Detection                                                                                               | Covered by         |
| --------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------ |
| `js-batch-dom-css`          | AST: multiple sequential `element.style.x = ...` assignments                                            | Custom plugin rule |
| `js-index-maps`             | AST: `array.find()`/`array.filter()` in loops — should build Map                                        | Custom plugin rule |
| `js-cache-property-access`  | AST: repeated deep property access (`obj.a.b.c`) in loops                                               | Custom plugin rule |
| `js-cache-function-results` | Heuristic: expensive function called with same args multiple times                                      | Info signal        |
| `js-cache-storage`          | AST: `localStorage.getItem` called multiple times for same key without caching                          | Custom plugin rule |
| `js-combine-iterations`     | AST: chained `.filter().map()` or `.map().filter()` that could be a single loop                         | Custom plugin rule |
| `js-length-check-first`     | AST: expensive comparison before cheap `array.length > 0` check                                         | Custom plugin rule |
| `js-early-exit`             | AST: deeply nested conditionals that could be early returns                                             | Custom plugin rule |
| `js-hoist-regexp`           | AST: `new RegExp()` or regex literal inside a loop body                                                 | Custom plugin rule |
| `js-min-max-loop`           | AST: `array.sort()[0]` or `array.sort()[length-1]` for min/max — use `Math.min/max` with spread or loop | Custom plugin rule |
| `js-set-map-lookups`        | AST: `array.includes()` in loops — should use `Set` for O(1)                                            | Custom plugin rule |
| `js-tosorted-immutable`     | AST: `[...arr].sort()` instead of `arr.toSorted()`                                                      | Custom plugin rule |

### 8. Advanced Patterns — LOW (3 rules)

| Rule                          | Detection                                                                                               | Covered by  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------- | ----------- |
| `advanced-event-handler-refs` | AST: `useCallback` with frequently changing deps for event handlers — should use ref pattern            | Info signal |
| `advanced-init-once`          | AST: module-level side effects or `useEffect([], ...)` for one-time init — should use init-once pattern | Info signal |
| `advanced-use-latest`         | AST: stale closure bugs in `useCallback` — should use `useLatest` ref pattern                           | Info signal |

## Step 7: Scoring Engine

Start at **100**, deduct per violation weighted by severity:

| Severity | Deduction                          | Examples                                                                                |
| -------- | ---------------------------------- | --------------------------------------------------------------------------------------- |
| Critical | -3 per violation (capped at -30)   | React Compiler errors, waterfall fetches, a11y violations, XSS vectors, duplicate React |
| Warning  | -1 per violation (capped at -40)   | `useMemo` overuse, `handleClick` naming, CSS files, layout animations, barrel imports   |
| Info     | -0.5 per violation (capped at -15) | `useEffect` count above threshold, icon library detected, missing metadata              |

Caps prevent one category from dominating the score. Floor at **0**. Score buckets:

- 90-100: healthy
- 70-89: needs attention
- 50-69: unhealthy
- <50: critical

### Category sub-scores

Report a breakdown score per category so users know where to focus:

| Category              | Rules contributing                                                             |
| --------------------- | ------------------------------------------------------------------------------ |
| Correctness           | React Compiler, rules-of-hooks, no-direct-mutation-state, set-state-in-render  |
| Security              | no-danger, no-user-input-in-href, no-secrets-in-client-code, no-eval           |
| Accessibility         | jsx-a11y rules, require-reduced-motion, missing viewport meta                  |
| Performance           | react-perf rules, animation rules, waterfall detection, bundle size rules      |
| State & Effects       | useEffect anti-patterns, derived state, cascading setState, state management   |
| Dead Code             | unused files, unused exports, unused dependencies (Knip)                       |
| Architecture          | giant components, nested definitions, barrel imports, hooks directory          |
| Responsive & Motion   | layout animations, fixed dimensions, desktop-first breakpoints, reduced-motion |
| Bundle Size           | icon libs, lodash, moment, undeferred scripts, dynamic imports, barrel files   |
| Next.js (conditional) | img element, a element, async client, missing suspense, missing metadata       |
| TypeScript            | any count, ts-ignore count, non-null assertions, type coverage                 |

## Step 8: Reporter — Code Frames + Summary

```
react-doctor v0.1.0

Scanning /path/to/project...

Found: Next.js 16.1 · React 19.2 · TypeScript 5.7 · 247 source files

──── Correctness ─────────────────────────────────────────────

  ✗ Derived state in useEffect — compute during render instead
    src/components/UserProfile.tsx:23
    │ 21 │ const [fullName, setFullName] = useState('');
    │ 22 │ useEffect(() => {
    │ 23 │   setFullName(first + ' ' + last);
    │    │   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    │ 24 │ }, [first, last]);

──── Security ────────────────────────────────────────────────

  ✗ dangerouslySetInnerHTML without sanitization
    src/components/RichText.tsx:12
    │ 10 │ return (
    │ 11 │   <div
    │ 12 │     dangerouslySetInnerHTML={{ __html: content }}
    │    │     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    │ 13 │   />

──── Accessibility ───────────────────────────────────────────

  ✗ div onClick without keyboard handler
    src/components/Card.tsx:42
    │ 40 │ return (
    │ 41 │   <div className="container">
    │ 42 │     <div onClick={handleOpen}>
    │    │     ^^^^^^^^^^^^^^^^^^^^^^^^^^^

──── Performance ─────────────────────────────────────────────

  ✗ Animating layout property "width" — use transform or layout prop
    src/components/Sidebar.tsx:18
    │ 17 │ <motion.div
    │ 18 │   animate={{ width: isOpen ? 280 : 0 }}
    │    │              ^^^^^^^^^^^^^^^^^^^^^^^^^

  ⚠ fetch inside useEffect — use react-query, SWR, or server component
    src/hooks/useData.ts:15
    │ 13 │ useEffect(() => {
    │ 14 │   const loadData = async () => {
    │ 15 │     const res = await fetch('/api/data');
    │    │                       ^^^^^^^^^^^^^^^^^

──── Architecture ────────────────────────────────────────────

  ⚠ Non-descriptive handler name "handleClick"
    src/pages/Dashboard.tsx:28

  ⚠ Component exceeds 200 lines (347 lines)
    src/components/DataTable.tsx:1

──── Bundle Size ─────────────────────────────────────────────

  ⚠ Import from barrel file — import directly from source module
    src/pages/Home.tsx:3
    │ 3 │ import { Button, Card, Modal } from '../components';
    │   │ ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

  ℹ Icon library detected: lucide-react (1,000+ components, tree-shaking risk)

──── Next.js ─────────────────────────────────────────────────

  ⚠ Using <img> instead of next/image — misses optimization
    src/components/Avatar.tsx:8

──────────────────────────────────────────────────────────────

Category Scores:
  Correctness    8/10    Security       7/10    Accessibility  6/10
  Performance    5/10    State/Effects  7/10    Architecture   8/10
  Responsive     9/10    Bundle Size    6/10    Next.js        8/10
  TypeScript     9/10

Metrics:
  useEffect count: 47    any count: 12    @ts-ignore: 3
  Test file ratio: 0.34  Components: 89   Avg component size: 67 lines

Score: 62/100 (unhealthy)
```

## Step 9: Tests

E2E tests against fixture projects with known violations:

| Fixture                      | Purpose                                                       |
| ---------------------------- | ------------------------------------------------------------- |
| `fixtures/healthy`           | Clean codebase, should score 95+                              |
| `fixtures/red-flags`         | All Jacob Paris red flags present                             |
| `fixtures/effect-abuse`      | Derived state, fetch-in-effect, cascading setState            |
| `fixtures/animation-jank`    | Layout animations, global CSS vars, missing reduced-motion    |
| `fixtures/security`          | dangerouslySetInnerHTML, javascript: URLs, hardcoded secrets  |
| `fixtures/bundle-bloat`      | Barrel imports, full lodash, icon library, moment.js          |
| `fixtures/nextjs-mistakes`   | img element, missing suspense, async client component         |
| `fixtures/responsive-broken` | Fixed dimensions, desktop-first breakpoints, no viewport meta |

---

## Deslop Integration

Inspired by the Ami deslop skill[^5] — react-doctor should also flag code complexity smells:

- Unnecessary complexity/nesting
- Redundant abstractions
- Over-engineering signals (nested ternaries, dense one-liners)

Maps to a "code quality" category in the scoring.

## rams.ai Inspiration

rams.ai[^6] checks 80+ design rules across 8 categories (accessibility, colors/tokens, animation, layout, typography, components, states/feedback, anti-AI patterns). React-doctor adopts a similar category structure for its output, focused on React code health rather than visual design. The "Anti-AI Patterns" category is particularly relevant — detecting over-engineered or "sloppy" code patterns.

---

[^1]: Jacob Paris red flags thread — https://x.com/jacobmparis/status/1716725617599844823

[^2]: React Compiler ESLint integration — https://react.dev/reference/eslint-plugin-react-hooks

[^3]: Oxlint + React Compiler incompatibility — https://github.com/oxc-project/oxc/issues/15258

[^4]: Vercel React Best Practices skill — https://skills.sh/vercel-labs/agent-skills/vercel-react-best-practices

[^5]: Ami deslop skill — `/Users/aidenybai/Projects/ami/.ami/skills/deslop/SKILL.md`

[^6]: rams.ai design rules — https://rams.ai/rules

[^7]: Aiden's action-types gist (memoization patterns) — https://gist.github.com/aidenybai/d1581ee44737dedc2e6640a9ca517ed1

[^8]: UI skills by ibelick — https://github.com/ibelick/ui-skills/tree/main/skills

[^9]: Web animation performance tier list — https://motion.dev/magazine/web-animation-performance-tier-list

[^10]: Matt Perry on animations — https://x.com/mattgperry/status/2021946163612529150

[^11]: Squirrelscan audit skill — https://skills.sh/squirrelscan/skills/audit-website

[^12]: Vercel design guidelines — https://vercel.com/design/guidelines

[^13]: Next.js best practices skill — https://skills.sh/vercel-labs/next-skills/next-best-practices

[^14]: Systematic debugging skill — https://skills.sh/obra/superpowers/systematic-debugging

[^15]: Oxlint JS plugins API — https://oxc.rs/docs/guide/usage/linter/js-plugins.html

[^16]: Vercel rerender-derived-state-no-effect — derived state should be computed during render, not in effects

[^17]: Motion performance docs — https://motion.dev/docs/performance

[^18]: prefers-reduced-motion (WCAG, MDN) — https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion

[^19]: Container queries — https://www.joshwcomeau.com/css/container-queries-unleashed/

[^20]: Motion react accessibility (useReducedMotion) — https://motion.dev/docs/react-accessibility

[^21]: Oxlint react/no-danger rule — https://oxc-project.github.io/docs/guide/usage/linter/rules/react/no-danger.html

[^22]: React useState anti-patterns (derived state) — https://javascript.plainenglish.io/react-usestate-anti-patterns-every-reviewer-should-flag-52f41742cd16

[^23]: React security checklist — https://www.propelcode.ai/blog/react-security-checklist-complete-guide-2025

[^24]: Squirrelscan 230+ rule website auditor — https://skills.sh/squirrelscan/skills/audit-website

[^25]: Next.js best practices skill — https://skills.sh/vercel-labs/next-skills/next-best-practices

[^26]: React anti-patterns (unnecessary effects, derived state) — https://letsbuild.cloud/2024-02-22-react-anti-patterns.html

[^27]: ibelick UI skills — https://github.com/ibelick/ui-skills/tree/main/skills

[^28]: Knip — find unused files, dependencies, exports, and types — https://knip.dev

[^29]: ts-prune is in maintenance mode, use Knip instead — https://effectivetypescript.com/2023/07/29/knip/
